// SOCIAL — post from the website as the site's own social accounts, and
// read back what the accounts are doing.
//
// Publishing goes through inbox_outbound, which already exists and
// already has the right shape: a state machine with refusal, attempts,
// dedupe_key, costs_money and approved_by. Nothing here posts directly
// to a platform from the request path — a queue row is written, and the
// dispatch step below drains it. That separation is what makes a failed
// post visible instead of lost.
//
// Refusals are computed BEFORE queueing, from inbox_channels capability
// flags and org_channels credentials, so "why didn't it post" is
// answered by a row rather than by reading logs. The capability notes in
// inbox_channels are the source of truth for what each platform can
// actually do — several of them cannot do what people assume:
//   threads   — no direct-message API exists at all
//   linkedin  — automated sending is not permitted
//   discord   — can be posted to, cannot be listened to from an edge fn
//   x         — sending costs money per call
//
// Actions:
//   { action: "channels" }                          — status of every channel
//   { action: "queue", channels: [...], body, kind } — queue a post
//   { action: "dispatch", max? }                     — drain the queue
//   { action: "stats", days? }                       — activity by channel

const SB = Deno.env.get("SUPABASE_URL")!;
const SRV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ORG_SLUG = Deno.env.get("INTAKE_ORG_SLUG") ?? "jnh-elevate";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });

async function db(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SB}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SRV,
      Authorization: `Bearer ${SRV}`,
      "content-type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`db ${r.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

type Channel = {
  key: string; label: string; enabled: boolean;
  can_read_comments: boolean; can_reply_comments: boolean;
  can_send_dm: boolean; dm_window_hours: number | null; note: string | null;
};
type OrgChannel = {
  channel: string; enabled: boolean; token_env: string | null; secret_id: string | null;
  account_id: string | null; account_label: string | null; last_error: string | null;
};

async function orgId(): Promise<string> {
  const rows = await db(`orgs?slug=eq.${encodeURIComponent(ORG_SLUG)}&select=id&limit=1`);
  if (!rows?.length) throw new Error("org not configured");
  return rows[0].id;
}

/** Everything known about every channel, joined. This is what the admin
 *  console renders, and what the chatbot is told before it offers to
 *  post anywhere. */
async function channels(org: string) {
  const platform: Channel[] = await db("inbox_channels?select=*&order=key.asc") ?? [];
  const mine: OrgChannel[] = await db(`org_channels?org_id=eq.${org}&select=*`) ?? [];
  const byKey = new Map(mine.map((m) => [m.channel, m]));

  return platform.map((p) => {
    const oc = byKey.get(p.key);
    const hasCredential = !!(oc?.token_env || oc?.secret_id);
    // A channel is postable only when the platform can do it, the org
    // switched it on, and a credential actually exists.
    const blockers: string[] = [];
    if (!p.enabled) blockers.push(`the platform channel is off: ${p.note ?? "no reason recorded"}`);
    if (!oc) blockers.push("this org has no row for that channel");
    else if (!oc.enabled) blockers.push("switched off for this org");
    if (p.key !== "site" && !hasCredential) blockers.push("no credential configured");
    if (oc?.last_error) blockers.push(`last error: ${oc.last_error}`);

    return {
      key: p.key,
      label: p.label,
      account: oc?.account_label ?? null,
      postable: blockers.length === 0,
      blockers,
      can_reply_comments: p.can_reply_comments,
      can_send_dm: p.can_send_dm,
      dm_window_hours: p.dm_window_hours,
      platform_note: p.note,
    };
  });
}

/**
 * Queue a post. Never sends inline: a row is written per channel, with a
 * refusal already filled in for the ones that cannot carry it, so the
 * operator sees "3 queued, 2 refused and why" instead of a silent
 * partial success.
 *
 * dedupe_key stops the same body going out twice to the same channel
 * when a retry or a double-click happens.
 */
async function queue(org: string, opts: { channels: string[]; body: string; kind: string; approvedBy?: string }) {
  const body = String(opts.body ?? "").trim();
  if (!body) throw new Error("empty post body");
  if (body.length > 5000) throw new Error("post body too long");

  const status = await channels(org);
  const byKey = new Map(status.map((s) => [s.key, s]));

  // Same body + channel + hour collapses into one row.
  const stamp = new Date().toISOString().slice(0, 13);
  const rows = [];
  const refused: { channel: string; why: string }[] = [];
  const queued: string[] = [];

  for (const key of opts.channels) {
    const s = byKey.get(key);
    if (!s) { refused.push({ channel: key, why: "unknown channel" }); continue; }

    const why = s.postable ? null : s.blockers.join("; ");
    if (why) refused.push({ channel: key, why });
    else queued.push(key);

    rows.push({
      org_id: org,
      channel: key,
      as_kind: opts.kind === "comment" ? "comment" : "post",
      target_id: s.account ?? key,
      body,
      state: why ? "refused" : "queued",
      refusal: why,
      // X charges per call. Marking it here means the dispatcher can
      // require an explicit approval for the ones that cost money.
      costs_money: key === "x",
      approved_by: opts.approvedBy ?? null,
      dedupe_key: `${key}:${stamp}:${body.slice(0, 64)}`,
    });
  }

  if (rows.length) {
    await db("inbox_outbound", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify(rows),
    });
  }
  return { queued, refused };
}

/**
 * Drain the queue. Each platform needs its own call shape, so this is a
 * registry rather than one generic POST. Only the ones whose API can be
 * driven from an edge function are here; the rest stay refused at queue
 * time with the reason from inbox_channels, which is honest about why.
 */
const PUBLISHERS: Record<string, (o: { token: string; accountId: string | null; body: string }) => Promise<string>> = {
  // Telegram: a bot token, no review, no fees. The one that works today.
  telegram: async ({ token, accountId, body }) => {
    if (!accountId) throw new Error("telegram needs a chat id in account_id");
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: accountId, text: body }),
    });
    const p = await r.json();
    if (!p.ok) throw new Error(p.description ?? `telegram ${r.status}`);
    return String(p.result?.message_id ?? "");
  },

  // Facebook Page feed.
  facebook: async ({ token, accountId, body }) => {
    if (!accountId) throw new Error("facebook needs the page id in account_id");
    const r = await fetch(`https://graph.facebook.com/v21.0/${accountId}/feed`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: body, access_token: token }),
    });
    const p = await r.json();
    if (p.error) throw new Error(p.error.message ?? "facebook error");
    return String(p.id ?? "");
  },

  // Slack. Answers 200 with {ok:false} on failure, so the body is what
  // decides success, not the status code.
  slack: async ({ token, accountId, body }) => {
    if (!accountId) throw new Error("slack needs a channel id in account_id");
    const r = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ channel: accountId, text: body }),
    });
    const p = await r.json();
    if (!p.ok) throw new Error(p.error ?? "slack error");
    return String(p.ts ?? "");
  },
};

async function dispatch(org: string, max: number) {
  const take = Math.min(Math.max(1, max || 10), 50);
  const rows = await db(
    `inbox_outbound?org_id=eq.${org}&state=eq.queued&select=id,channel,target_id,body,costs_money,approved_by&order=created_at.asc&limit=${take}`,
  ) ?? [];

  let sent = 0, failed = 0, held = 0;

  for (const row of rows) {
    // Anything that costs money per call waits for a named approver.
    if (row.costs_money && !row.approved_by) {
      held++;
      await db(`inbox_outbound?id=eq.${row.id}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ state: "refused", refusal: "sending on this channel costs money and nobody approved it" }),
      }).catch(() => {});
      continue;
    }

    const publisher = PUBLISHERS[row.channel];
    if (!publisher) {
      held++;
      await db(`inbox_outbound?id=eq.${row.id}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ state: "refused", refusal: `no publisher is wired for ${row.channel} yet` }),
      }).catch(() => {});
      continue;
    }

    const oc = (await db(`org_channels?org_id=eq.${org}&channel=eq.${row.channel}&select=token_env,secret_id,account_id&limit=1`))?.[0];
    // Credentials live in the environment or the vault, never in a table
    // column and never in a log line.
    const token = oc?.token_env ? (Deno.env.get(oc.token_env) ?? "") : "";
    if (!token) {
      failed++;
      await db(`inbox_outbound?id=eq.${row.id}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ state: "failed", last_error: `no value for ${oc?.token_env ?? "the credential"}`, attempts: 1 }),
      }).catch(() => {});
      continue;
    }

    try {
      const externalId = await publisher({ token, accountId: oc?.account_id ?? row.target_id, body: row.body });
      sent++;
      await db(`inbox_outbound?id=eq.${row.id}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ state: "sent", external_id: externalId, sent_at: new Date().toISOString(), attempts: 1 }),
      });
      await db(`org_channels?org_id=eq.${org}&channel=eq.${row.channel}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ last_ok_at: new Date().toISOString(), last_error: null }),
      }).catch(() => {});
    } catch (e) {
      failed++;
      const msg = String(e).slice(0, 400);
      await db(`inbox_outbound?id=eq.${row.id}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ state: "failed", last_error: msg, attempts: 1 }),
      }).catch(() => {});
      await db(`org_channels?org_id=eq.${org}&channel=eq.${row.channel}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ last_error: msg, last_error_at: new Date().toISOString() }),
      }).catch(() => {});
    }
  }

  return { sent, failed, held, considered: rows.length };
}

/** What the accounts have actually been doing. */
async function stats(org: string, days: number) {
  const since = new Date(Date.now() - Math.min(Math.max(days || 30, 1), 365) * 86_400_000).toISOString();

  const convs = await db(`inbox_conversations?org_id=eq.${org}&created_at=gte.${since}&select=channel,status`) ?? [];
  const out = await db(`inbox_outbound?org_id=eq.${org}&created_at=gte.${since}&select=channel,state`) ?? [];

  const byChannel: Record<string, Record<string, number>> = {};
  const bump = (ch: string, k: string) => {
    byChannel[ch] ??= {};
    byChannel[ch][k] = (byChannel[ch][k] ?? 0) + 1;
  };
  for (const c of convs) bump(c.channel, `conversations_${c.status}`);
  for (const o of out) bump(o.channel, `posts_${o.state}`);

  return { since, by_channel: byChannel };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let p: Record<string, unknown>;
  try { p = await req.json(); } catch { return json({ error: "bad json" }, 400); }

  try {
    const org = await orgId();
    const action = String(p.action ?? "");

    if (action === "channels") return json({ ok: true, channels: await channels(org) });
    if (action === "stats") return json({ ok: true, ...(await stats(org, Number(p.days ?? 30))) });
    if (action === "dispatch") return json({ ok: true, ...(await dispatch(org, Number(p.max ?? 10))) });
    if (action === "queue") {
      const list = Array.isArray(p.channels) ? p.channels.map(String) : [];
      if (!list.length) return json({ error: "channels[] required" }, 400);
      return json({
        ok: true,
        ...(await queue(org, {
          channels: list,
          body: String(p.body ?? ""),
          kind: String(p.kind ?? "post"),
          approvedBy: p.approved_by ? String(p.approved_by) : undefined,
        })),
      });
    }
    return json({ error: "unknown action" }, 400);
  } catch (e) {
    console.error("social", e);
    return json({ error: String(e).slice(0, 300) }, 500);
  }
});

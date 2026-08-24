// OUTREACH — mass email that cannot quietly become spam.
//
// Two audiences, deliberately not treated the same:
//   warm — companies that inquired. consent='inquired' on the contact.
//   cold — companies that never asked. Lawful in the US under CAN-SPAM,
//          but only with an honest From, a real postal address in the
//          body, and a working opt-out. This function refuses to send a
//          cold campaign unless all three are actually present.
//
// The refusals below are the point of the file. Every one of them is a
// case where sending anyway would be easy and would eventually cost the
// sending domain its reputation, or Jay a complaint he cannot answer.
//
// Actions (POST body):
//   { action: "build",   campaign_id }  — resolve the audience into rows
//   { action: "send",    campaign_id, max? } — send one throttled batch
//   { action: "pause",   campaign_id }
//   { action: "stats",   campaign_id }
//
// verify_jwt is ON. Sending mail as the org is not an anonymous act.

const SB = Deno.env.get("SUPABASE_URL")!;
const SRV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const PUBLIC_FN = Deno.env.get("PUBLIC_FUNCTIONS_URL") ?? `${SB}/functions/v1`;

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

/** The literal the seed writes so a campaign cannot go out under an
 *  address nobody set. If this string is still in the sender, stop. */
const PLACEHOLDER_ADDRESS = "SET REAL POSTAL ADDRESS BEFORE SENDING";

type Sender = {
  id: string; from_name: string; from_email: string; reply_to: string | null;
  postal_address: string; verified: boolean;
};
type Campaign = {
  id: string; org_id: string; name: string; sender_id: string; subject: string;
  body_text: string; body_html: string | null; audience: Record<string, unknown>;
  audience_kind: "warm" | "cold"; status: string; throttle_per_hour: number;
  approved_by: string | null;
};

/**
 * Everything that must be true before a single message leaves. Returns a
 * list of reasons; an empty list means go. Kept as one function so the
 * preflight the operator sees and the check the sender runs are the same
 * code — a preview that is more permissive than the sender is a lie.
 */
function blockers(c: Campaign, s: Sender): string[] {
  const out: string[] = [];
  if (!RESEND_KEY) out.push("no RESEND_API_KEY is configured, so nothing can send");
  if (!s.verified) out.push(`the sending domain for ${s.from_email} is not verified with the provider yet`);
  if (!s.postal_address || s.postal_address === PLACEHOLDER_ADDRESS) {
    out.push("the sender has no real postal address, which CAN-SPAM requires in the message body");
  }
  if (!c.subject.trim()) out.push("the subject is empty");
  if (!c.body_text.trim()) out.push("the body is empty");
  if (c.status === "paused") out.push("the campaign is paused");
  if (c.status === "done") out.push("the campaign has already finished");
  // Cold mail goes to people who never asked. A human says yes to that,
  // every time, and the record of who said yes is kept.
  if (c.audience_kind === "cold" && !c.approved_by) {
    out.push("a cold campaign has to be approved by a person before it sends");
  }
  return out;
}

/** Substitutions. Unknown tokens are emptied rather than left visible —
 *  "Hi {{name}}," reaching a stranger is worse than "Hi ,". */
function render(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k: string) => vars[k] ?? "");
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/** The footer is not decoration. The postal address and the opt-out are
 *  what make the message lawful, so they are appended by the sender and
 *  cannot be edited out of a template. */
function withFooter(bodyText: string, s: Sender, unsubUrl: string) {
  const text = `${bodyText}\n\n—\n${s.from_name}\n${s.postal_address}\n\nUnsubscribe: ${unsubUrl}`;
  const html =
    `<div style="font:15px/1.6 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#101b2c">` +
    escapeHtml(bodyText).replace(/\n/g, "<br>") +
    `<hr style="border:0;border-top:1px solid #ddd;margin:24px 0">` +
    `<div style="font-size:12px;color:#6d7581">` +
    `${escapeHtml(s.from_name)}<br>${escapeHtml(s.postal_address)}<br><br>` +
    `<a href="${unsubUrl}" style="color:#3157d5">Unsubscribe</a> from these emails.` +
    `</div></div>`;
  return { text, html };
}

/** Resolve audience filters into the contacts they mean. */
async function audienceQuery(c: Campaign): Promise<string> {
  const a = c.audience ?? {};
  const parts = [`org_id=eq.${c.org_id}`, "select=id,email,name,company_id,consent,unsub_token"];
  // A warm campaign may only reach people who actually came to us. This
  // is enforced here rather than trusted to whoever wrote the filter.
  if (c.audience_kind === "warm") parts.push("consent=in.(inquired,opted_in)");
  if (typeof a.consent === "string") parts.push(`consent=eq.${encodeURIComponent(a.consent)}`);
  parts.push("limit=5000");
  return `out_contacts?${parts.join("&")}`;
}

async function loadCampaign(id: string): Promise<{ c: Campaign; s: Sender }> {
  const rows = await db(`out_campaigns?id=eq.${id}&select=*&limit=1`);
  if (!rows?.length) throw new Error("no such campaign");
  const c = rows[0] as Campaign;
  const sr = await db(`out_sender_identities?id=eq.${c.sender_id}&select=*&limit=1`);
  if (!sr?.length) throw new Error("campaign has no sender identity");
  return { c, s: sr[0] as Sender };
}

/** Build the recipient list. Suppressed addresses are written in as
 *  'skipped' with the reason rather than silently dropped, so the count
 *  the operator sees adds up and the omission is explainable. */
async function build(campaignId: string) {
  const { c } = await loadCampaign(campaignId);
  const contacts = await db(await audienceQuery(c)) ?? [];

  const supp = await db(`out_suppressions?org_id=eq.${c.org_id}&select=address`) ?? [];
  const blocked = new Set(supp.map((s: { address: string }) => s.address.toLowerCase()));

  let queued = 0, skipped = 0;
  const rows = contacts.map((ct: { id: string; email: string }) => {
    const addr = ct.email.toLowerCase();
    const isBlocked = blocked.has(addr);
    if (isBlocked) skipped++; else queued++;
    return {
      campaign_id: c.id,
      org_id: c.org_id,
      contact_id: ct.id,
      address: addr,
      state: isBlocked ? "skipped" : "queued",
      skip_reason: isBlocked ? "on the suppression list" : null,
    };
  });

  if (rows.length) {
    await db("out_recipients", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify(rows),
    });
  }
  return { audience: contacts.length, queued, skipped };
}

async function sendBatch(campaignId: string, max: number) {
  const { c, s } = await loadCampaign(campaignId);

  const stop = blockers(c, s);
  if (stop.length) return { sent: 0, failed: 0, blocked: stop };

  // Throttle is per hour; a batch is at most what that rate allows in the
  // ten minutes a cron tick covers, so a big list drips instead of
  // arriving as one spike that trips every filter it meets.
  const perTick = Math.max(1, Math.ceil(c.throttle_per_hour / 6));
  const take = Math.min(max || perTick, perTick, 200);

  const queue = await db(
    `out_recipients?campaign_id=eq.${c.id}&state=eq.queued&select=id,address,contact_id&limit=${take}`,
  ) ?? [];

  if (!queue.length) {
    await db(`out_campaigns?id=eq.${c.id}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: "done" }),
    });
    return { sent: 0, failed: 0, done: true };
  }

  if (c.status !== "sending") {
    await db(`out_campaigns?id=eq.${c.id}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: "sending" }),
    });
  }

  let sent = 0, failed = 0;

  for (const r of queue) {
    // Re-check immediately before sending. The list was built earlier and
    // somebody may have unsubscribed in between; that gap is exactly
    // where an unwanted email gets sent.
    const still = await db(
      `out_suppressions?org_id=eq.${c.org_id}&address=eq.${encodeURIComponent(r.address)}&select=address&limit=1`,
    );
    if (still?.length) {
      await db(`out_recipients?id=eq.${r.id}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ state: "skipped", skip_reason: "suppressed before send" }),
      });
      continue;
    }

    const ct = r.contact_id
      ? (await db(`out_contacts?id=eq.${r.contact_id}&select=name,unsub_token,company_id&limit=1`))?.[0]
      : null;

    let companyName = "";
    if (ct?.company_id) {
      const co = await db(`out_companies?id=eq.${ct.company_id}&select=name&limit=1`);
      companyName = co?.[0]?.name ?? "";
    }

    const unsubUrl = `${PUBLIC_FN}/unsubscribe?t=${ct?.unsub_token ?? ""}`;
    const vars = {
      name: ct?.name ?? "",
      first_name: (ct?.name ?? "").split(" ")[0] ?? "",
      company: companyName,
      unsubscribe_url: unsubUrl,
    };

    const body = render(c.body_text, vars);
    const { text, html } = withFooter(body, s, unsubUrl);

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: `${s.from_name} <${s.from_email}>`,
          to: [r.address],
          reply_to: s.reply_to ?? undefined,
          subject: render(c.subject, vars),
          text,
          html: c.body_html ? render(c.body_html, vars) : html,
          // RFC 8058. Gmail and Apple Mail render a real unsubscribe
          // button from these, which is the difference between someone
          // leaving the list and someone hitting "report spam".
          headers: {
            "List-Unsubscribe": `<${unsubUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.message ?? `resend ${res.status}`);

      await db(`out_recipients?id=eq.${r.id}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          state: "sent", provider_id: payload?.id ?? null,
          sent_at: new Date().toISOString(), attempts: 1,
        }),
      });
      await db("out_events", {
        method: "POST", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ org_id: c.org_id, recipient_id: r.id, address: r.address, type: "sent" }),
      }).catch(() => {});
      sent++;
    } catch (e) {
      failed++;
      await db(`out_recipients?id=eq.${r.id}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ state: "failed", last_error: String(e).slice(0, 400), attempts: 1 }),
      }).catch(() => {});
      await db("out_events", {
        method: "POST", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          org_id: c.org_id, recipient_id: r.id, address: r.address,
          type: "failed", detail: { error: String(e).slice(0, 300) },
        }),
      }).catch(() => {});
    }
  }

  return { sent, failed };
}

async function stats(campaignId: string) {
  const { c, s } = await loadCampaign(campaignId);
  const counts = await db(
    `out_recipients?campaign_id=eq.${c.id}&select=state`,
  ) ?? [];
  const by: Record<string, number> = {};
  for (const r of counts) by[r.state] = (by[r.state] ?? 0) + 1;

  const events = await db(
    `out_events?org_id=eq.${c.org_id}&select=type&order=at.desc&limit=2000`,
  ) ?? [];
  const evBy: Record<string, number> = {};
  for (const e of events) evBy[e.type] = (evBy[e.type] ?? 0) + 1;

  return {
    campaign: { id: c.id, name: c.name, status: c.status, audience_kind: c.audience_kind },
    recipients: by,
    events: evBy,
    blocked_by: blockers(c, s),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let p: Record<string, unknown>;
  try { p = await req.json(); } catch { return json({ error: "bad json" }, 400); }

  const action = String(p.action ?? "");
  const id = String(p.campaign_id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "campaign_id required" }, 400);

  try {
    if (action === "build") return json({ ok: true, ...(await build(id)) });
    if (action === "send")  return json({ ok: true, ...(await sendBatch(id, Number(p.max ?? 0))) });
    if (action === "stats") return json({ ok: true, ...(await stats(id)) });
    if (action === "pause") {
      await db(`out_campaigns?id=eq.${id}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ status: "paused" }),
      });
      return json({ ok: true, status: "paused" });
    }
    return json({ error: "unknown action" }, 400);
  } catch (e) {
    console.error("outreach", e);
    return json({ error: String(e).slice(0, 300) }, 500);
  }
});

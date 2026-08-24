// OUTREACH-WEBHOOK — what the provider tells us happened afterwards.
//
// Sending is not delivering. Resend reports delivery, opens, clicks,
// bounces and complaints after the fact, and two of those are not
// statistics: a hard bounce and a spam complaint are instructions.
// Both are written straight into out_suppressions here, because an
// address that bounced or complained must never be tried again — that
// is what protects the sending domain's reputation.
//
// verify_jwt is off (a webhook cannot present one) so the signature is
// the whole authentication. An unsigned delivery is a stranger.

import { Webhook } from "npm:svix@1.24.0";

const SB = Deno.env.get("SUPABASE_URL")!;
const SRV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SIGNING_SECRET = Deno.env.get("RESEND_WEBHOOK_SECRET") ?? "";

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

// Resend event name -> what we record. Anything not in here is ignored
// rather than guessed at.
const TYPE: Record<string, string> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.delivery_delayed": "failed",
};

// The two that stop future sending outright.
const SUPPRESSING: Record<string, string> = {
  bounced: "bounced",
  complained: "complained",
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });

  const raw = await req.text();

  // Not configured means refuse, never allow. A webhook endpoint that
  // accepts unsigned posts is an open write into the suppression list.
  if (!SIGNING_SECRET) {
    console.error("outreach-webhook: RESEND_WEBHOOK_SECRET is unset; refusing");
    return new Response("not configured", { status: 503 });
  }

  let event: { type?: string; data?: Record<string, unknown> };
  try {
    const wh = new Webhook(SIGNING_SECRET);
    event = wh.verify(raw, {
      "svix-id": req.headers.get("svix-id") ?? "",
      "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
      "svix-signature": req.headers.get("svix-signature") ?? "",
    }) as typeof event;
  } catch (e) {
    console.error("outreach-webhook bad signature", String(e).slice(0, 200));
    return new Response("bad signature", { status: 401 });
  }

  const type = TYPE[String(event.type ?? "")];
  if (!type) return new Response("ignored", { status: 200 });

  const data = event.data ?? {};
  const providerId = String(data.email_id ?? data.id ?? "");
  const to = Array.isArray(data.to) ? String(data.to[0] ?? "") : String(data.to ?? "");
  const address = to.toLowerCase().trim();
  if (!address) return new Response("no address", { status: 200 });

  try {
    // Match back to the recipient row by provider id where we can; the
    // address alone is not unique across campaigns.
    let recipient: { id: string; org_id: string } | null = null;
    if (providerId) {
      const rows = await db(`out_recipients?provider_id=eq.${encodeURIComponent(providerId)}&select=id,org_id&limit=1`);
      recipient = rows?.[0] ?? null;
    }
    if (!recipient) {
      const rows = await db(`out_recipients?address=eq.${encodeURIComponent(address)}&select=id,org_id&order=created_at.desc&limit=1`);
      recipient = rows?.[0] ?? null;
    }
    if (!recipient) return new Response("unmatched", { status: 200 });

    await db("out_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        org_id: recipient.org_id,
        recipient_id: recipient.id,
        address,
        type,
        detail: { provider_id: providerId, raw_type: event.type },
      }),
    });

    const reason = SUPPRESSING[type];
    if (reason) {
      // A soft bounce is also written here. Distinguishing soft from hard
      // reliably needs provider-specific parsing, and the cost of being
      // wrong in this direction is one lost recipient; the other
      // direction costs the whole domain.
      await db("out_suppressions", {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify({
          org_id: recipient.org_id,
          address,
          reason,
          detail: `auto from ${event.type}`,
        }),
      });
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("outreach-webhook", e);
    // 500 makes Resend retry, which is what we want for a transient
    // database problem — the event is not lost.
    return new Response("error", { status: 500 });
  }
});

// INTAKE — where the website's forms actually land.
//
// Before this existed, the Jay Connect intake flow ended at
// `setStep(3)`: the visitor was told "we got it" and nothing had been
// got. This is the destination that makes that screen true.
//
// It is public (verify_jwt off) because the people it serves do not have
// accounts — that is the entire point of the form. Everything a stranger
// can do here is bounded: fixed org, fixed field set, length caps, and a
// per-IP rate limit.
//
// One submission produces up to three things:
//   1. an out_companies / out_contacts pair, so the person or org enters
//      the CRM with consent='inquired' — they came to us, which is the
//      strongest consent basis outreach can have
//   2. an inbox conversation, so the reply happens in the same desk as
//      every other channel
//   3. nothing else. No email is sent from here; the outreach engine
//      owns sending, and it checks suppressions first.

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

/** Trim, cap, and never trust a length. */
const str = (v: unknown, max: number): string => String(v ?? "").trim().slice(0, max);

/** Deliberately loose. Rejecting odd-but-valid addresses loses real
 *  people; the send path finds the truly dead ones via bounces. */
const emailOk = (e: string) => /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(e) && e.length <= 254;

/** The site's intake asks for "phone or email" in one field, so accept
 *  either. Someone reaching out for help is far more likely to have a
 *  phone than an inbox, and turning them away over a field format is
 *  the wrong failure. */
const phoneOk = (v: string) => (v.match(/\d/g) ?? []).length >= 7;

const KINDS = new Set(["partnership", "brand", "help", "booking", "press", "volunteer", "other"]);

/** In-memory, per-instance, best-effort. Not a security boundary — it is
 *  there so one bored person cannot fill the table from a laptop. Real
 *  abuse protection belongs at the edge. */
const seen = new Map<string, number[]>();
function rateLimited(ip: string, limit = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const hits = (seen.get(ip) ?? []).filter((t) => now - t < windowMs);
  hits.push(now);
  seen.set(ip, hits);
  if (seen.size > 5000) seen.clear();
  return hits.length > limit;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) return json({ error: "slow down" }, 429);

  let payload: Record<string, unknown>;
  try { payload = await req.json(); }
  catch { return json({ error: "bad json" }, 400); }

  // A hidden field no human fills in. Bots do. Answer 200 so the bot
  // believes it succeeded and does not come back with a variation.
  if (str(payload.website, 200)) return json({ ok: true });

  const name = str(payload.name, 120);
  // `contact` is the single "phone or email" field the site uses; the
  // split fields are accepted too for anything posting directly.
  const contact = str(payload.contact, 254);
  const contactIsEmail = emailOk(contact.toLowerCase());
  const email = str(payload.email, 254).toLowerCase() || (contactIsEmail ? contact.toLowerCase() : "");
  const phone = str(payload.phone, 40) || (!contactIsEmail && phoneOk(contact) ? contact : "");
  const company = str(payload.company, 160);
  const message = str(payload.message, 4000) || str(payload.note, 4000);
  const needs = Array.isArray(payload.needs) ? payload.needs.map((n) => str(n, 60)).slice(0, 12) : [];
  const kindRaw = str(payload.kind, 40).toLowerCase();
  const kind = KINDS.has(kindRaw) ? kindRaw : "other";
  const page = str(payload.page, 200);

  if (!name) return json({ error: "name is required" }, 400);
  if (!email && !phone) {
    return json({ error: "leave a phone number or an email so someone can reach you" }, 400);
  }
  if (email && !emailOk(email)) return json({ error: "that email does not look reachable" }, 400);

  try {
    const orgs = await db(`orgs?slug=eq.${encodeURIComponent(ORG_SLUG)}&select=id&limit=1`);
    if (!orgs?.length) return json({ error: "org not configured" }, 500);
    const orgId = orgs[0].id;

    // ── company ──
    let companyId: string | null = null;
    const domain = email ? (email.split("@")[1] ?? null) : null;
    const isFreeMail = /^(gmail|yahoo|hotmail|outlook|icloud|aol|proton(mail)?)\./.test(domain ?? "");
    if (company || (domain && !isFreeMail)) {
      // Only treat the email domain as a company domain when it is not a
      // consumer mailbox — otherwise every gmail.com sender collapses
      // into one "company" record.
      const useDomain = isFreeMail ? null : domain;
      const existing = useDomain
        ? await db(`out_companies?org_id=eq.${orgId}&domain=eq.${encodeURIComponent(useDomain)}&select=id&limit=1`)
        : null;
      if (existing?.length) {
        companyId = existing[0].id;
      } else {
        const made = await db("out_companies", {
          method: "POST",
          body: JSON.stringify({
            org_id: orgId,
            name: company || useDomain || name,
            domain: useDomain,
            kind: kind === "brand" ? "brand" : kind === "press" ? "media" : "nonprofit",
            source: "inquiry",
            status: "replied",
            notes: `Inbound: ${kind}`,
          }),
        });
        companyId = made[0].id;
      }
    }

    // ── contact ──
    // Only when there is an address to hold. A phone-only enquiry is a
    // real person and a real conversation, but it is not an outreach
    // contact, and inventing a placeholder address to make the row fit
    // would poison the send list.
    // consent='inquired' with a source, because they wrote to us first.
    // That provenance is what a "why am I getting this" question is
    // answered with later.
    const existingContact = email
      ? await db(`out_contacts?org_id=eq.${orgId}&email=eq.${encodeURIComponent(email)}&select=id&limit=1`)
      : null;
    if (!email) {
      // Phone-only: nothing to put on the outreach side, and that is the
      // correct outcome rather than a gap to paper over.
    } else if (existingContact?.length) {
      await db(`out_contacts?id=eq.${existingContact[0].id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          name: name || undefined,
          company_id: companyId ?? undefined,
          consent: "inquired",
          consent_source: `intake:${kind}`,
          consent_at: new Date().toISOString(),
        }),
      });
    } else {
      await db("out_contacts", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          org_id: orgId,
          company_id: companyId,
          email,
          name,
          consent: "inquired",
          consent_source: `intake:${kind}`,
          consent_at: new Date().toISOString(),
        }),
      });
    }

    // ── the conversation ──
    // Routed into the same inbox as every other channel so there is one
    // desk, not a form pile nobody opens.
    const externalId = email || `tel:${phone}`;
    const contactRows = await db(
      `inbox_contacts?org_id=eq.${orgId}&channel=eq.site&external_id=eq.${encodeURIComponent(externalId)}&select=id&limit=1`,
    );
    let inboxContactId: string;
    if (contactRows?.length) {
      inboxContactId = contactRows[0].id;
      await db(`inbox_contacts?id=eq.${inboxContactId}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ display_name: name, email: email || null, last_seen: new Date().toISOString() }),
      });
    } else {
      const made = await db("inbox_contacts", {
        method: "POST",
        body: JSON.stringify({
          org_id: orgId,
          channel: "site",
          external_id: externalId,
          display_name: name,
          email: email || null,
          meta: { phone, company, kind, page, needs },
        }),
      });
      inboxContactId = made[0].id;
    }

    const conv = await db("inbox_conversations", {
      method: "POST",
      body: JSON.stringify({
        org_id: orgId,
        contact_id: inboxContactId,
        channel: "site",
        kind: "dm",
        subject_ref: `intake:${kind}`,
      }),
    });

    await db("inbox_messages", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        conv_id: conv[0].id,
        direction: "in",
        author: "contact",
        body: [
          `[${kind}] ${name}${company ? ` — ${company}` : ""}`,
          [email && `email: ${email}`, phone && `phone: ${phone}`].filter(Boolean).join("  ·  "),
          needs.length ? `needs: ${needs.join(" · ")}` : "",
          "",
          message || "(no message left)",
        ].join("\n"),
        state: "delivered",
      }),
    });

    return json({ ok: true, message: "Got it. Jay reads these himself." });
  } catch (e) {
    console.error("intake", e);
    return json({ error: "server" }, 500);
  }
});

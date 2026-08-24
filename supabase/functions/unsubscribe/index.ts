// UNSUBSCRIBE — the door out. Public on purpose.
//
// This is the one endpoint in the outreach system that must never be
// clever. It takes a token, writes a suppression, and says so. It does
// not ask "are you sure", it does not offer preferences, and it has no
// undo: a person who clicked leave has left.
//
// verify_jwt is off because the person leaving is, by definition, not
// logged in — they are holding an email from six months ago.
//
// It renders no HTML, and that is forced rather than chosen: the
// Supabase edge gateway pins every function response to
//   content-type: text/plain
//   content-security-policy: default-src 'none'; sandbox
//   x-content-type-options: nosniff
// so a page built here would reach the reader as visible source. The
// confirmation therefore lives on the site's own domain and this
// endpoint redirects to it once the suppression is written.
//
// Two entry points, because mail clients use both:
//   POST  — RFC 8058 one-click, sent by Gmail/Apple Mail from the header
//            List-Unsubscribe-Post: List-Unsubscribe=One-Click
//   GET   — a human clicking the link in the footer
// Both suppress immediately. A GET that a prefetcher fires will
// unsubscribe someone who did not ask to leave, and that is the error
// this system prefers to make.

const SB = Deno.env.get("SUPABASE_URL")!;
const SRV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE = (Deno.env.get("PUBLIC_SITE_URL") ?? "").replace(/\/+$/, "");

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

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

/** Writes the suppression. Idempotent: unsubscribing twice is not an error,
 *  and the original reason/date is what stays on the record. */
async function suppress(token: string): Promise<"ok" | "unknown"> {
  const rows = await db(
    `out_contacts?unsub_token=eq.${encodeURIComponent(token)}&select=id,org_id,email`,
  );
  if (!rows?.length) return "unknown";
  const c = rows[0];

  await db("out_suppressions", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({
      org_id: c.org_id,
      address: c.email,
      reason: "unsubscribed",
      detail: "via unsubscribe link",
    }),
  });

  await db("out_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      org_id: c.org_id,
      address: String(c.email).toLowerCase(),
      type: "unsubscribed",
      detail: { source: "link" },
    }),
  }).catch(() => {});

  return "ok";
}

/** Plain text that reads correctly even though the gateway will label it
 *  text/plain. Used whenever there is no site to hand off to. */
const say = (msg: string, status = 200) =>
  new Response(msg, { status, headers: { ...cors, "cache-control": "no-store" } });

const landing = (state: "done" | "unknown" | "error") =>
  SITE
    ? new Response(null, {
        status: 302,
        headers: { ...cors, location: `${SITE}/unsubscribed/?s=${state}`, "cache-control": "no-store" },
      })
    : say(
        state === "error"
          ? "We could not complete that just now. Reply to the email with the word STOP and you will be removed by hand."
          : "You have been unsubscribed. No further outreach will be sent to this address.",
        state === "error" ? 500 : 200,
      );

function tokenOf(url: URL): string | null {
  const t = url.searchParams.get("t") ?? url.searchParams.get("token");
  return t && /^[0-9a-f-]{36}$/i.test(t) ? t : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = new URL(req.url);
  const token = tokenOf(url);

  // One-click from the mail client. Body is form-encoded and ignored;
  // the token is in the URL the header carried.
  if (req.method === "POST") {
    if (!token) return say("missing token", 400);
    try {
      await suppress(token);
    } catch (e) {
      console.error("unsubscribe post", e);
      // Still 200: a mail client that gets a 500 shows the reader a
      // failure for something that is our problem, not theirs. The
      // address is recoverable from the logs and out_events.
    }
    return say("unsubscribed");
  }

  if (req.method !== "GET") return say("GET or POST", 405);

  if (!token) {
    return say(
      "That unsubscribe link was cut short by your mail client. Reply to the email with the word STOP and you will be removed by hand.",
      400,
    );
  }

  try {
    // An unrecognised token still gets the same page. It is either
    // already-deleted or forged, and neither is the reader's problem.
    await suppress(token);
    return landing("done");
  } catch (e) {
    console.error("unsubscribe get", e);
    return landing("error");
  }
});

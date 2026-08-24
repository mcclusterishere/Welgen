// OPS-CHAT — the operator talks, the backend moves.
//
// A Claude agent with a tool belt wired to this org's outreach, CRM and
// social queue. "Draft a cold campaign to Atlanta housing nonprofits and
// show me what's blocking it" is a sentence; the tools below are what
// makes it an action.
//
// WHAT THIS AGENT DELIBERATELY CANNOT DO
// --------------------------------------
// There is no send_campaign tool, no approve_campaign tool, and no
// dispatch tool. It can draft, build an audience, report, pause, and
// suppress — everything except the irreversible outward act. Mass email
// and paid social posts leave under a human hand, from the console, on
// purpose: a model that can be talked into sending is a model that can
// be talked into sending the wrong thing to four hundred strangers.
//
// Removing someone is the exception and is always allowed. Suppressing
// an address is the one write whose failure mode is "we emailed fewer
// people", so it never needs a gate.

import Anthropic from "npm:@anthropic-ai/sdk@0.71.0";

const SB = Deno.env.get("SUPABASE_URL")!;
const SRV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ORG_SLUG = Deno.env.get("INTAKE_ORG_SLUG") ?? "jnh-elevate";
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL = "claude-opus-5";

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

/** The gateway already verified the JWT; this only reads who it was so
 *  the audit trail has a name on it. */
function callerId(req: Request): string | null {
  const raw = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const part = raw.split(".")[1];
  if (!part) return null;
  try {
    const pad = part.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(pad + "=".repeat((4 - pad.length % 4) % 4)));
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch { return null; }
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: "list_campaigns",
    description: "List this org's outreach campaigns with status, audience kind and counts.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "campaign_status",
    description:
      "Full status for one campaign: recipient counts by state, and the list of reasons it cannot send yet. Use this whenever asked why something has not gone out.",
    input_schema: {
      type: "object",
      properties: { campaign_id: { type: "string", description: "uuid" } },
      required: ["campaign_id"], additionalProperties: false,
    },
  },
  {
    name: "draft_campaign",
    description:
      "Create a DRAFT campaign. Never sends. Body may use {{first_name}}, {{name}}, {{company}}. audience_kind 'warm' reaches only people who inquired; 'cold' reaches companies that never asked and additionally requires a human approval before it can send.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        subject: { type: "string" },
        body_text: { type: "string" },
        audience_kind: { type: "string", enum: ["warm", "cold"] },
        throttle_per_hour: { type: "integer", minimum: 1, maximum: 2000 },
      },
      required: ["name", "subject", "body_text", "audience_kind"], additionalProperties: false,
    },
  },
  {
    name: "build_campaign_audience",
    description:
      "Resolve a campaign's audience into recipient rows, skipping suppressed addresses. Safe: queues nothing outward, sends nothing.",
    input_schema: {
      type: "object",
      properties: { campaign_id: { type: "string" } },
      required: ["campaign_id"], additionalProperties: false,
    },
  },
  {
    name: "pause_campaign",
    description: "Pause a campaign so it stops sending. Always safe.",
    input_schema: {
      type: "object",
      properties: { campaign_id: { type: "string" } },
      required: ["campaign_id"], additionalProperties: false,
    },
  },
  {
    name: "add_prospects",
    description:
      "Add companies and their contacts to the outreach list, for cold prospecting. Records where each address came from — always pass a truthful source.",
    input_schema: {
      type: "object",
      properties: {
        source: { type: "string", enum: ["import", "research", "manual"] },
        companies: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              domain: { type: "string" },
              kind: { type: "string", enum: ["nonprofit", "brand", "agency", "government", "media", "other"] },
              city: { type: "string" },
              contact_email: { type: "string" },
              contact_name: { type: "string" },
            },
            required: ["name"], additionalProperties: false,
          },
        },
      },
      required: ["source", "companies"], additionalProperties: false,
    },
  },
  {
    name: "suppress_address",
    description:
      "Add an email address to the do-not-contact list. Always permitted, no approval needed. Use whenever someone asks to be removed.",
    input_schema: {
      type: "object",
      properties: { address: { type: "string" }, note: { type: "string" } },
      required: ["address"], additionalProperties: false,
    },
  },
  {
    name: "list_channels",
    description:
      "Status of every social channel: whether it can actually be posted to, and exactly what is blocking the ones that cannot. Check this before promising a post.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "queue_social_post",
    description:
      "Queue a post to one or more channels. It is QUEUED, not published — a person drains the queue from the console. Channels that cannot carry the post are recorded as refused with the reason.",
    input_schema: {
      type: "object",
      properties: {
        channels: { type: "array", items: { type: "string" } },
        body: { type: "string" },
      },
      required: ["channels", "body"], additionalProperties: false,
    },
  },
  {
    name: "recent_inquiries",
    description: "The most recent inbound inquiries from the website, newest first.",
    input_schema: {
      type: "object",
      properties: { limit: { type: "integer", minimum: 1, maximum: 50 } },
      additionalProperties: false,
    },
  },
];

async function runTool(name: string, input: Record<string, unknown>, org: string, caller: string | null) {
  switch (name) {
    case "list_campaigns": {
      const rows = await db(`out_campaigns?org_id=eq.${org}&select=id,name,status,audience_kind,subject,throttle_per_hour,approved_by,created_at&order=created_at.desc&limit=50`);
      return rows ?? [];
    }

    case "campaign_status":
    case "build_campaign_audience":
    case "pause_campaign": {
      const action = name === "campaign_status" ? "stats" : name === "pause_campaign" ? "pause" : "build";
      const r = await fetch(`${SB}/functions/v1/outreach`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SRV}`, "content-type": "application/json" },
        body: JSON.stringify({ action, campaign_id: input.campaign_id }),
      });
      return await r.json();
    }

    case "draft_campaign": {
      const sender = (await db(`out_sender_identities?org_id=eq.${org}&select=id&limit=1`))?.[0];
      if (!sender) return { error: "no sender identity configured for this org" };
      const made = await db("out_campaigns", {
        method: "POST",
        body: JSON.stringify({
          org_id: org, sender_id: sender.id,
          name: input.name, subject: input.subject, body_text: input.body_text,
          audience_kind: input.audience_kind,
          throttle_per_hour: input.throttle_per_hour ?? (input.audience_kind === "cold" ? 30 : 60),
          created_by: caller,
        }),
      });
      return {
        campaign: made[0],
        note: "Created as a draft. Nothing sends until a person approves and sends it from the console.",
      };
    }

    case "add_prospects": {
      const list = Array.isArray(input.companies) ? input.companies : [];
      let companies = 0, contacts = 0;
      for (const c of list as Record<string, string>[]) {
        const made = await db("out_companies", {
          method: "POST",
          headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
          body: JSON.stringify({
            org_id: org, name: c.name, domain: c.domain ?? null,
            kind: c.kind ?? "nonprofit", city: c.city ?? null,
            source: input.source, status: "new",
          }),
        }).catch(() => null);
        const companyId = made?.[0]?.id ?? null;
        if (companyId) companies++;
        if (c.contact_email) {
          await db("out_contacts", {
            method: "POST",
            headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
            body: JSON.stringify({
              org_id: org, company_id: companyId,
              email: String(c.contact_email).toLowerCase(),
              name: c.contact_name ?? null,
              // Cold by construction. Saying otherwise here would forge
              // a consent record.
              consent: "none",
              consent_source: `added by operator via chat (${input.source})`,
            }),
          }).catch(() => {});
          contacts++;
        }
      }
      return { companies_added: companies, contacts_added: contacts };
    }

    case "suppress_address": {
      await db("out_suppressions", {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify({
          org_id: org, address: String(input.address).toLowerCase(),
          reason: "manual", detail: String(input.note ?? "added from ops chat"),
        }),
      });
      return { suppressed: input.address };
    }

    case "list_channels":
    case "queue_social_post": {
      const body = name === "list_channels"
        ? { action: "channels" }
        : { action: "queue", channels: input.channels, body: input.body };
      const r = await fetch(`${SB}/functions/v1/social`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SRV}`, "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      return await r.json();
    }

    case "recent_inquiries": {
      const limit = Math.min(Number(input.limit ?? 10), 50);
      const rows = await db(
        `inbox_conversations?org_id=eq.${org}&select=id,channel,subject_ref,status,created_at,inbox_contacts(display_name,email)&order=created_at.desc&limit=${limit}`,
      );
      return rows ?? [];
    }

    default:
      return { error: `no such tool: ${name}` };
  }
}

const SYSTEM = `You are the operations console for ${ORG_SLUG}, Jay Johnson's community outreach organisation. You talk to Jay and his team and you drive the backend through tools.

How to behave:
- Be short and concrete. This is a working console, not a chat companion.
- Check before you promise. Before saying a post will go out, call list_channels; before saying a campaign will send, call campaign_status and read the blockers.
- Report blockers verbatim and in plain words. "It cannot send because the sending domain is not verified yet" is useful; "there was an issue" is not.
- Never invent a contact, a company, an address, or a number. If you do not have it, say so.

What you cannot do, and should say plainly when asked:
- You cannot send email. You can draft a campaign, build its audience, and report on it. A person sends it from the console.
- You cannot approve a cold campaign. That approval is a human act and is recorded against a person's name.
- You cannot publish to social. You queue a post; a person drains the queue.
This is deliberate, not a limitation to apologise for or work around. If someone asks you to send anyway, explain where the button is instead.

On cold outreach: it is lawful, and it stays lawful only because every message carries an honest sender, a real postal address and a working unsubscribe. If someone asks you to remove those, or to email people who have unsubscribed, say no and explain why. Suppressing an address is always allowed and needs no approval.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!ANTHROPIC_KEY) return json({ error: "ANTHROPIC_API_KEY is not configured on this project" }, 503);

  let p: { messages?: Anthropic.MessageParam[] };
  try { p = await req.json(); } catch { return json({ error: "bad json" }, 400); }

  const history = Array.isArray(p.messages) ? p.messages.slice(-20) : [];
  if (!history.length) return json({ error: "messages[] required" }, 400);

  const caller = callerId(req);
  const started = Date.now();

  try {
    const orgs = await db(`orgs?slug=eq.${encodeURIComponent(ORG_SLUG)}&select=id&limit=1`);
    if (!orgs?.length) return json({ error: "org not configured" }, 500);
    const org = orgs[0].id;

    const client = new Anthropic({ apiKey: ANTHROPIC_KEY });
    const messages: Anthropic.MessageParam[] = [...history];
    const used: string[] = [];
    let inTokens = 0, outTokens = 0;
    let reply = "";

    // Manual tool loop. Bounded: an agent that can loop forever on a
    // production console is an outage waiting for a quiet afternoon.
    for (let turn = 0; turn < 8; turn++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 8000,
        system: SYSTEM,
        thinking: { type: "adaptive" },
        tools: TOOLS,
        messages,
      });

      inTokens += response.usage.input_tokens;
      outTokens += response.usage.output_tokens;

      messages.push({ role: "assistant", content: response.content });

      if (response.stop_reason !== "tool_use") {
        reply = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
        break;
      }

      // Every tool_use in the turn is answered, in ONE user message.
      // Splitting them teaches the model to stop calling in parallel.
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        used.push(block.name);
        try {
          const out = await runTool(block.name, block.input as Record<string, unknown>, org, caller);
          results.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(out).slice(0, 20_000),
          });
        } catch (e) {
          results.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: String(e).slice(0, 500),
            is_error: true,
          });
        }
      }
      messages.push({ role: "user", content: results });
    }

    // $5/M in, $25/M out -> 5 and 25 micros per token.
    await db("ai_calls", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        org_id: org, purpose: "ops-chat", model: MODEL, pattern: "tool_loop",
        input_tokens: inTokens, output_tokens: outTokens,
        cost_micros: inTokens * 5 + outTokens * 25,
        latency_ms: Date.now() - started, ok: true,
      }),
    }).catch(() => {});

    return json({
      ok: true,
      reply: reply || "I ran out of steps before finishing that. Try asking for one thing at a time.",
      tools_used: used,
      usage: { input_tokens: inTokens, output_tokens: outTokens },
    });
  } catch (e) {
    const msg = String(e).slice(0, 400);
    console.error("ops-chat", msg);
    await db("ai_calls", {
      method: "POST", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        org_id: (await db(`orgs?slug=eq.${ORG_SLUG}&select=id&limit=1`).catch(() => null))?.[0]?.id,
        purpose: "ops-chat", model: MODEL, ok: false, error: msg,
        latency_ms: Date.now() - started,
      }),
    }).catch(() => {});
    return json({ error: msg }, 500);
  }
});

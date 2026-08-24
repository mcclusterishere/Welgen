# Backend — this site is a client of the **Here** platform

The public site is a static export on GitHub Pages (`output: "export"`),
so it has **no server of its own**: no API routes, no server actions, no
session on the server. Everything dynamic goes from the browser straight
to the Here Supabase project, and the security boundary is row-level
security plus the edge functions' own checks.

- **Project:** `Here` (`zmnhbrjyhxzhkxmhkexs`)
- **Org (tenant):** `jnh-elevate` — *JNH Elevate — Jay Johnson*, a client
  org alongside the studio's own `mccluster` org
- **Client code:** [`lib/here.ts`](../lib/here.ts) — plain `fetch`, zero
  new npm dependencies, so it cannot break anyone else's build

## What was added, and why it lives where it does

The Here platform already had the multi-tenant spine: `orgs`,
`org_members`, `org_channels`, the whole `inbox_*` desk with its flow
engine, and `ai_calls` for LLM accounting. None of that was rebuilt.
What was missing was an org-scoped **outreach** engine, so that is what
the new `out_*` tables are — and they follow the platform's existing
conventions (`private.is_org_member` / `private.is_org_owner` for RLS,
credentials by `token_env` or Vault `secret_id`, never in a column).

### Schema (`out_*`)

| Table | What it holds |
|---|---|
| `out_sender_identities` | From name/address, reply-to, and the **postal address** the law requires in every message. `verified` flips on only once the domain is verified with the provider. |
| `out_companies` | Prospects and inbound orgs. `source` records how they got here (`inquiry` means they came to us). |
| `out_contacts` | People. `consent` + `consent_source` + `consent_at` are the provenance that answers "why am I getting this". Every contact carries its own `unsub_token` from creation and it is never regenerated — a link printed six months ago has to keep working. |
| `out_campaigns` | `audience_kind` is `warm` (only people who inquired) or `cold` (companies that never asked). Cold additionally requires a human `approved_by` before it can send. |
| `out_recipients` | One row per address per campaign, with `state` and `skip_reason`. Suppressed addresses are written in as `skipped` **with the reason** rather than silently dropped, so the counts add up. |
| `out_events` | `sent / delivered / opened / clicked / bounced / complained / unsubscribed / failed`. |
| `out_suppressions` | The list that outranks every campaign. No delete policy exists: taking someone off the do-not-email list is not an operation this system offers. |

## Edge functions

| Function | JWT | What it does |
|---|---|---|
| `intake` | off | The destination the website's form posts to. Accepts the site's single "phone or email" field. Creates the CRM records **and** an inbox conversation, so replies happen at the same desk as every other channel. Honeypot + per-IP rate limit. |
| `unsubscribe` | off | Writes the suppression, then redirects to `/unsubscribed/` on the site. Handles both RFC 8058 one-click `POST` and a human's `GET`. |
| `outreach` | on | `build` / `send` / `pause` / `stats`. Refuses to send unless the sender is verified, has a real postal address, and (for cold) a person has approved it. Re-checks suppressions immediately before each send. |
| `outreach-webhook` | off | Resend delivery events, signature-verified. Bounces and complaints write straight into `out_suppressions` — those are instructions, not statistics. Fails closed if the signing secret is unset. |
| `social` | on | `channels` / `queue` / `dispatch` / `stats`. Queues through `inbox_outbound`; refusals are computed *before* queueing so "why didn't it post" is answered by a row. |
| `ops-chat` | on | The Claude agent (`claude-opus-5`, adaptive thinking, tool loop). Logs usage to `ai_calls`. |

### What `ops-chat` deliberately cannot do

There is no `send_campaign`, no `approve_campaign` and no `dispatch`
tool. It drafts, builds audiences, adds prospects, queues posts, reports
and pauses. The irreversible outward acts — mass email, paid social
posts, approving cold outreach — happen under a human hand from the
console. A model that can be talked into sending is a model that can be
talked into sending the wrong thing to four hundred strangers.

Suppressing an address is the exception and needs no approval: its only
failure mode is emailing fewer people.

### Why the unsubscribe page is on the website, not in the function

Supabase's edge gateway pins every function response to
`content-type: text/plain` with `x-content-type-options: nosniff` and a
`default-src 'none'; sandbox` CSP. HTML built in a function reaches the
reader as visible source. So `unsubscribe` writes the suppression and
`302`s to `/unsubscribed/`, which is a real page on jnhelevate.com.

## Still to do before any of this sends

1. **Supabase → Project Settings → Edge Functions → Secrets:**
   - `RESEND_API_KEY` — until this exists, `outreach` refuses to send
   - `RESEND_WEBHOOK_SECRET` — until this exists, `outreach-webhook` returns 503 rather than trusting an unsigned post
   - `ANTHROPIC_API_KEY` — until this exists, `ops-chat` returns a clear 503
   - `PUBLIC_SITE_URL` = `https://jnhelevate.com`
   - Channel tokens as needed: `JNH_TELEGRAM_TOKEN`, `JNH_META_PAGE_TOKEN`, `JNH_SLACK_BOT_TOKEN`, …
2. **Nothing.** The project URL and anon key are checked into
   `lib/here.ts`, so the site works as deployed. Both are public values —
   they ship in the browser bundle of every Supabase app and RLS is what
   protects the data. The `NEXT_PUBLIC_SUPABASE_*` Actions variables
   still override them if you ever point a build at a different project.
   The service role key is **not** here and must never be: it bypasses
   RLS and belongs only in the functions' server-side environment.
3. **Logins — done.** `jjohnson.inef@gmail.com` and
   `matthew@mccluster.org` both exist, are email-confirmed, and are
   `owner` on the `jnh-elevate` org. To add anyone else, create the user
   in Supabase → Authentication → Users, then:
   ```sql
   insert into org_members (org_id, profile_id, role)
   select o.id, u.id, 'owner'
   from orgs o, auth.users u
   where o.slug = 'jnh-elevate' and u.email = '<their-email>'
   on conflict (org_id, profile_id) do update set role = 'owner';
   ```
   Without that row RLS correctly shows a signed-in user nothing.

   **Passwords.** `/admin` → Account changes your own password with no
   email involved — that is the route to trust. "Forgot your password?"
   on the sign-in page emails a link to `/admin/reset/`, which only works
   once SMTP is sorted (see below).

   **SMTP.** The project uses Supabase's built-in mailer, which is
   rate-limited and often will not deliver to an external mailbox. Until
   a real SMTP provider is set in Authentication → Emails, treat reset
   emails as unreliable and reset passwords from the Account tab or the
   dashboard instead. Add `https://jnhelevate.com/admin/reset/` to
   Authentication → URL Configuration → Redirect URLs when you do wire
   SMTP, or the link in the email will be rejected on arrival.
4. **Real sender details.** The seeded sender identity has the literal
   `SET REAL POSTAL ADDRESS BEFORE SENDING`, and the send path refuses
   that string on purpose. Set a real mailing address, verify the sending
   domain in Resend, then set `verified = true`.
5. **Point the Resend webhook** at `…/functions/v1/outreach-webhook`.
6. **Optional cron** (`pg_cron` or an external scheduler) to call
   `outreach` `send` and `social` `dispatch` every ten minutes, which is
   what turns the throttle into a drip instead of a spike.

## Deploying function changes

The functions are deployed to the Here project. From this repo:

```bash
supabase functions deploy intake --project-ref zmnhbrjyhxzhkxmhkexs
```

They live here because this is the client site that drives them; if the
Here platform gets its own repo section for functions, move them there
and this directory becomes the record of what the site expects.

/**
 * HERE — the client half of the backend.
 *
 * This site is a *client* of the Here platform (the Supabase project of
 * that name), not a thing with its own server. It is exported statically
 * to GitHub Pages, so there is no Next.js server, no API routes and no
 * server actions available: every call below goes straight from the
 * browser to a Supabase edge function or to PostgREST, and the security
 * boundary is row-level security plus the functions' own checks.
 *
 * Deliberately written with plain `fetch` and no SDK. Adding
 * @supabase/supabase-js would mean editing package.json, which is shared
 * ground with the rest of the site; this file adds zero dependencies and
 * cannot break anyone else's build.
 */

/**
 * The Here project this site is a client of.
 *
 * These are checked in deliberately. A Supabase URL and anon key are
 * public values — they ship inside the JavaScript bundle of every
 * Supabase app, so anyone can read them out of the browser regardless.
 * The security boundary is row-level security on the tables and the
 * checks inside the edge functions, not the secrecy of this key. What
 * must never appear here is the service role key, which bypasses RLS
 * entirely and lives only in the functions' server-side environment.
 *
 * Checked in rather than injected because a missing build variable
 * fails silently and invisibly: the site still builds, still deploys,
 * and quietly drops every form submission. The env vars still override,
 * so pointing this at a different project stays a one-line change.
 */
const DEFAULT_URL = "https://zmnhbrjyhxzhkxmhkexs.supabase.co";
const DEFAULT_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inptbmhicmp5aHh6aGt4bWhrZXhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMTQ3MTMsImV4cCI6MjA5OTc5MDcxM30.guqcG26tPMCeXrFQ91PWNKoXdNFa1C3C9GUzneyWdFk";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON;

export const backendConfigured = Boolean(URL_ && ANON);

const fn = (name: string) => `${URL_}/functions/v1/${name}`;

/** Where the session lives. Access tokens are short-lived and the
 *  refresh token is what actually matters, so both stay in one place
 *  that is easy to clear on sign-out. */
const SESSION_KEY = "here.session";

export type Session = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: { id: string; email?: string };
};

export function loadSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function storeSession(s: Session | null) {
  if (typeof window === "undefined") return;
  try {
    if (s) window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* private mode; the session just won't survive a reload */
  }
}

async function auth(path: string, body: Record<string, unknown>) {
  const r = await fetch(`${URL_}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: ANON, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(payload?.error_description || payload?.msg || payload?.error || `sign-in failed (${r.status})`);
  }
  return payload;
}

export async function signIn(email: string, password: string): Promise<Session> {
  const p = await auth("token?grant_type=password", { email, password });
  const session: Session = {
    access_token: p.access_token,
    refresh_token: p.refresh_token,
    expires_at: Date.now() + (p.expires_in ?? 3600) * 1000,
    user: { id: p.user?.id, email: p.user?.email },
  };
  storeSession(session);
  return session;
}

export function signOut() {
  storeSession(null);
}

/** Refresh a few minutes early rather than waiting for a 401 mid-action. */
async function freshToken(): Promise<string | null> {
  const s = loadSession();
  if (!s) return null;
  if (Date.now() < s.expires_at - 120_000) return s.access_token;

  try {
    const p = await auth("token?grant_type=refresh_token", { refresh_token: s.refresh_token });
    const next: Session = {
      access_token: p.access_token,
      refresh_token: p.refresh_token ?? s.refresh_token,
      expires_at: Date.now() + (p.expires_in ?? 3600) * 1000,
      user: { id: p.user?.id ?? s.user.id, email: p.user?.email ?? s.user.email },
    };
    storeSession(next);
    return next.access_token;
  } catch {
    // A refresh token that no longer works means the session is over.
    storeSession(null);
    return null;
  }
}

/**
 * Ask Supabase to email a recovery link.
 *
 * Whether the mail actually arrives depends on the project's SMTP: the
 * built-in sender is rate-limited and frequently does not reach external
 * mailboxes, so this is the convenient path rather than the dependable
 * one. The dependable path is changePassword() below, which needs no
 * email at all.
 *
 * Always resolves. The endpoint deliberately answers the same way for a
 * known and an unknown address so that it cannot be used to discover who
 * has an account, and this mirrors that.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/admin/reset/`
      : "https://jnhelevate.com/admin/reset/";

  await fetch(`${URL_}/auth/v1/recover`, {
    method: "POST",
    headers: { apikey: ANON, "content-type": "application/json" },
    body: JSON.stringify({ email, gotrue_meta_security: {} , redirect_to: redirectTo }),
  }).catch(() => {});
}

/** Set a new password using the token from a recovery link. */
export async function setPasswordWithToken(accessToken: string, password: string): Promise<void> {
  const r = await fetch(`${URL_}/auth/v1/user`, {
    method: "PUT",
    headers: { apikey: ANON, Authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const p = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(p?.msg || p?.error_description || p?.error || `could not set the password (${r.status})`);
}

/**
 * Change the password of the signed-in user. No email involved, which is
 * why this is the route to trust: it works on a project with no SMTP
 * configured at all.
 */
export async function changePassword(password: string): Promise<void> {
  const token = await freshToken();
  if (!token) throw new NotSignedIn();
  await setPasswordWithToken(token, password);
}

export class NotSignedIn extends Error {
  constructor() {
    super("signed out");
  }
}

/** Call an edge function that requires a session. */
async function callAuthed<T>(name: string, body: unknown): Promise<T> {
  if (!backendConfigured) throw new Error("the backend is not configured for this build");
  const token = await freshToken();
  if (!token) throw new NotSignedIn();

  const r = await fetch(fn(name), {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await r.json().catch(() => ({}));
  if (r.status === 401) {
    storeSession(null);
    throw new NotSignedIn();
  }
  if (!r.ok) throw new Error(payload?.error ?? `${name} failed (${r.status})`);
  return payload as T;
}

/** Read a table through PostgREST. RLS decides what comes back. */
async function selectRows<T>(query: string): Promise<T[]> {
  if (!backendConfigured) return [];
  const token = await freshToken();
  if (!token) throw new NotSignedIn();

  const r = await fetch(`${URL_}/rest/v1/${query}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${token}` },
  });
  if (r.status === 401) {
    storeSession(null);
    throw new NotSignedIn();
  }
  if (!r.ok) throw new Error(`read failed (${r.status})`);
  return (await r.json()) as T[];
}

// ── public: the intake form's destination ──

export type IntakePayload = {
  name: string;
  /** The site's single "phone or email" field. Either is accepted. */
  contact?: string;
  email?: string;
  phone?: string;
  note?: string;
  company?: string;
  kind?: "partnership" | "brand" | "help" | "booking" | "press" | "volunteer" | "other";
  needs?: string[];
  page?: string;
  /** Honeypot. Real people leave it empty. */
  website?: string;
};

/**
 * Public, unauthenticated, and intentionally forgiving: if this throws,
 * the caller should still show the visitor their confirmation. Losing a
 * submission is bad; telling someone in crisis that the form is broken
 * when the request may well have landed is worse.
 */
export async function submitIntake(payload: IntakePayload): Promise<{ ok: boolean; error?: string }> {
  if (!backendConfigured) return { ok: false, error: "not configured" };
  try {
    const r = await fetch(fn("intake"), {
      method: "POST",
      headers: { apikey: ANON, "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const p = await r.json().catch(() => ({}));
    return r.ok ? { ok: true } : { ok: false, error: p?.error ?? `failed (${r.status})` };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ── authenticated: the console ──

export type Channel = {
  key: string;
  label: string;
  account: string | null;
  postable: boolean;
  blockers: string[];
  platform_note: string | null;
};

export type Campaign = {
  id: string;
  name: string;
  status: string;
  audience_kind: "warm" | "cold";
  subject: string;
  approved_by: string | null;
  created_at: string;
};

export const here = {
  channels: () => callAuthed<{ channels: Channel[] }>("social", { action: "channels" }),
  socialStats: (days = 30) =>
    callAuthed<{ by_channel: Record<string, Record<string, number>> }>("social", { action: "stats", days }),
  queuePost: (channels: string[], body: string) =>
    callAuthed<{ queued: string[]; refused: { channel: string; why: string }[] }>("social", {
      action: "queue",
      channels,
      body,
    }),
  dispatchPosts: (max = 10) =>
    callAuthed<{ sent: number; failed: number; held: number }>("social", { action: "dispatch", max }),

  campaigns: () => selectRows<Campaign>("out_campaigns?select=*&order=created_at.desc&limit=50"),
  campaignStats: (id: string) =>
    callAuthed<{ recipients: Record<string, number>; blocked_by: string[] }>("outreach", {
      action: "stats",
      campaign_id: id,
    }),
  buildCampaign: (id: string) =>
    callAuthed<{ audience: number; queued: number; skipped: number }>("outreach", {
      action: "build",
      campaign_id: id,
    }),
  sendCampaign: (id: string, max?: number) =>
    callAuthed<{ sent: number; failed: number; blocked?: string[] }>("outreach", {
      action: "send",
      campaign_id: id,
      max,
    }),
  pauseCampaign: (id: string) => callAuthed<{ status: string }>("outreach", { action: "pause", campaign_id: id }),

  ask: (messages: { role: "user" | "assistant"; content: string }[]) =>
    callAuthed<{ reply: string; tools_used: string[] }>("ops-chat", { messages }),

  inquiries: () =>
    selectRows<{ id: string; subject_ref: string | null; status: string; created_at: string }>(
      "inbox_conversations?select=id,subject_ref,status,created_at&order=created_at.desc&limit=25",
    ),
};

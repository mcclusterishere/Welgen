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

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

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

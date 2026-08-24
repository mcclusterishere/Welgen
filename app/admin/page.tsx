"use client";

/**
 * THE OPERATIONS CONSOLE — the surface Jay logs in through.
 *
 * A static page that authenticates against Supabase Auth from the
 * browser and then talks to the Here backend's edge functions. There is
 * no server here to protect anything, and it does not need one: every
 * read is gated by row-level security on org membership, and every write
 * that leaves the building is gated inside the edge functions.
 *
 * The console shows blockers rather than hiding them. A campaign that
 * cannot send says why, in the same words the sender uses, because the
 * common failure in an outreach tool is a button that looks armed and
 * silently does nothing.
 */

import { useCallback, useEffect, useState } from "react";
import {
  backendConfigured,
  here,
  loadSession,
  NotSignedIn,
  signIn,
  signOut,
  type Campaign,
  type Channel,
  type Session,
} from "@/lib/here";

type Tab = "chat" | "outreach" | "social";

const NAVY = "#0b1629";
const BLUE = "#3157d5";

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSession(loadSession());
    setReady(true);
  }, []);

  const onSignedOut = useCallback(() => {
    signOut();
    setSession(null);
  }, []);

  // Render nothing decisive until localStorage has been read, otherwise
  // a signed-in operator sees the login form flash on every load.
  if (!ready) return <main style={{ minHeight: "100vh", background: "#f4f6f8" }} />;

  if (!session) return <SignIn onSignedIn={setSession} />;
  return <Console session={session} onSignedOut={onSignedOut} />;
}

/* ─────────────────────────── sign in ─────────────────────────── */

function SignIn({ onSignedIn }: { onSignedIn: (s: Session) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      onSignedIn(await signIn(email.trim(), password));
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: NAVY,
        padding: 24,
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: "min(100%, 400px)",
          background: "#fff",
          borderRadius: 20,
          padding: "38px 34px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 26 }}>
          <span
            style={{
              display: "grid",
              placeItems: "center",
              width: 40,
              height: 40,
              borderRadius: 12,
              background: BLUE,
              color: "#fff",
              fontSize: 12,
              fontWeight: 900,
            }}
          >
            JJ
          </span>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <b style={{ fontSize: 12, letterSpacing: 1 }}>JAY JOHNSON</b>
            <small style={{ fontSize: 8, letterSpacing: 1.5, color: "#7f8ca2", marginTop: 3 }}>
              OPERATIONS
            </small>
          </div>
        </div>

        <h1 style={{ font: "400 30px/1 Georgia, serif", margin: "0 0 22px" }}>Sign in.</h1>

        {!backendConfigured && (
          <p style={box("#fff4e5", "#8a5a00")}>
            This build has no backend configured. Set NEXT_PUBLIC_SUPABASE_URL and
            NEXT_PUBLIC_SUPABASE_ANON_KEY and redeploy.
          </p>
        )}

        <label style={labelStyle}>
          <span>Email</span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          <span>Password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </label>

        {error && <p style={box("#fdecee", "#a3202f")}>{error}</p>}

        <button
          type="submit"
          disabled={busy || !backendConfigured}
          style={{
            width: "100%",
            marginTop: 20,
            border: 0,
            borderRadius: 13,
            background: busy ? "#8c9bd4" : NAVY,
            color: "#fff",
            padding: "15px 16px",
            fontSize: 12,
            fontWeight: 900,
            cursor: busy ? "default" : "pointer",
          }}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <p style={{ fontSize: 10, lineHeight: 1.6, color: "#959189", margin: "16px 0 0" }}>
          Accounts are created by the studio. There is no public sign-up.
        </p>
      </form>
    </main>
  );
}

/* ─────────────────────────── console ─────────────────────────── */

function Console({ session, onSignedOut }: { session: Session; onSignedOut: () => void }) {
  const [tab, setTab] = useState<Tab>("chat");

  return (
    <main className="dashboard-shell">
      <aside className="dash-sidebar">
        <a className="dash-brand" href="/">
          <span>JJ</span>
          <div>
            <b>JAY JOHNSON</b>
            <small>OPERATIONS</small>
          </div>
        </a>
        <nav>
          {(
            [
              ["chat", "⌘", "Ask"],
              ["outreach", "✉", "Outreach"],
              ["social", "◎", "Channels"],
            ] as [Tab, string, string][]
          ).map(([id, icon, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className={tab === id ? "active" : ""}
              onClick={(e) => {
                e.preventDefault();
                setTab(id);
              }}
            >
              <i>{icon}</i>
              {label}
            </a>
          ))}
        </nav>
        <div className="dash-profile">
          <div>
            <b>{session.user.email ?? "Signed in"}</b>
            <span>
              <button
                onClick={onSignedOut}
                style={{ border: 0, background: "none", color: "#79869b", padding: 0, cursor: "pointer", font: "inherit" }}
              >
                Sign out
              </button>
            </span>
          </div>
        </div>
      </aside>

      <div className="dash-main">
        <header className="dash-header">
          <div>
            <span>OPERATIONS</span>
            <h1>
              {tab === "chat" ? "Talk to the backend." : tab === "outreach" ? "Outreach." : "Channels."}
            </h1>
          </div>
        </header>

        {tab === "chat" && <AskPanel />}
        {tab === "outreach" && <OutreachPanel />}
        {tab === "social" && <SocialPanel />}
      </div>
    </main>
  );
}

/* ─────────────────────────── ask ─────────────────────────── */

function AskPanel() {
  const [log, setLog] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    const next = [...log, { role: "user" as const, content: text }];
    setLog(next);
    setInput("");
    setBusy(true);
    setError("");
    try {
      const r = await here.ask(next);
      setLog([...next, { role: "assistant", content: r.reply }]);
    } catch (err) {
      setError(err instanceof NotSignedIn ? "Session expired — reload and sign in." : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="pipeline-panel">
      <div className="panel-head">
        <div>
          <span>OPS CHAT</span>
          <h2>Ask for what you want.</h2>
        </div>
      </div>

      <p style={{ fontSize: 11, lineHeight: 1.7, color: "#68738a", margin: "0 0 16px" }}>
        It can draft campaigns, build audiences, add prospects, queue posts and report on any of it.
        It cannot send email, approve a cold campaign, or publish to social — those stay on your
        hand, from the tabs on the left.
      </p>

      <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
        {log.map((m, i) => (
          <div
            key={i}
            style={{
              justifySelf: m.role === "user" ? "end" : "start",
              maxWidth: "85%",
              background: m.role === "user" ? "#eef1ff" : "#f4f6f8",
              border: "1px solid #e1e4e8",
              borderRadius: 14,
              padding: "12px 14px",
              fontSize: 12,
              lineHeight: 1.65,
              whiteSpace: "pre-wrap",
            }}
          >
            {m.content}
          </div>
        ))}
        {busy && <p style={{ fontSize: 11, color: "#8a929e", margin: 0 }}>Working…</p>}
      </div>

      {error && <p style={box("#fdecee", "#a3202f")}>{error}</p>}

      <form onSubmit={send} style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Draft a warm campaign to everyone who inquired this month"
          style={{ ...inputStyle, marginTop: 0, flex: 1 }}
        />
        <button type="submit" disabled={busy} className="dash-header-button" style={sendBtn}>
          Send
        </button>
      </form>
    </section>
  );
}

/* ─────────────────────────── outreach ─────────────────────────── */

function OutreachPanel() {
  const [rows, setRows] = useState<Campaign[] | null>(null);
  const [detail, setDetail] = useState<Record<string, { recipients: Record<string, number>; blocked_by: string[] }>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    here.campaigns().then(setRows).catch((e) => setError(String(e)));
  }, []);

  const inspect = async (id: string) => {
    try {
      const s = await here.campaignStats(id);
      setDetail((d) => ({ ...d, [id]: s }));
    } catch (e) {
      setError(String(e));
    }
  };

  const act = async (id: string, what: "build" | "send" | "pause") => {
    try {
      if (what === "build") await here.buildCampaign(id);
      if (what === "send") await here.sendCampaign(id);
      if (what === "pause") await here.pauseCampaign(id);
      await inspect(id);
      setRows(await here.campaigns());
    } catch (e) {
      setError(String(e));
    }
  };

  if (error) return <p style={box("#fdecee", "#a3202f")}>{error}</p>;
  if (!rows) return <p style={{ fontSize: 11, color: "#8a929e" }}>Loading…</p>;
  if (!rows.length) {
    return (
      <section className="pipeline-panel">
        <p style={{ fontSize: 12, color: "#68738a", margin: 0 }}>
          No campaigns yet. Ask the console to draft one.
        </p>
      </section>
    );
  }

  return (
    <section className="pipeline-panel">
      <div className="lane-table">
        {rows.map((c) => {
          const d = detail[c.id];
          return (
            <article key={c.id} style={{ display: "block", padding: "16px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div>
                  <b style={{ fontSize: 12 }}>{c.name}</b>
                  <p style={{ fontSize: 10, color: "#8a929e", margin: "4px 0 0" }}>
                    {c.audience_kind} · {c.status} · {c.subject}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={miniBtn} onClick={() => inspect(c.id)}>Check</button>
                  <button style={miniBtn} onClick={() => act(c.id, "build")}>Build</button>
                  <button style={{ ...miniBtn, background: BLUE, color: "#fff" }} onClick={() => act(c.id, "send")}>
                    Send batch
                  </button>
                  <button style={miniBtn} onClick={() => act(c.id, "pause")}>Pause</button>
                </div>
              </div>

              {d && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ fontSize: 10, color: "#68738a", margin: "0 0 6px" }}>
                    {Object.entries(d.recipients).map(([k, v]) => `${v} ${k}`).join(" · ") || "no recipients yet"}
                  </p>
                  {d.blocked_by.length > 0 && (
                    <ul style={{ ...box("#fff4e5", "#8a5a00"), margin: 0, paddingLeft: 22 }}>
                      {d.blocked_by.map((b) => (
                        <li key={b} style={{ marginBottom: 3 }}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* ─────────────────────────── social ─────────────────────────── */

function SocialPanel() {
  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [body, setBody] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [result, setResult] = useState<{ queued: string[]; refused: { channel: string; why: string }[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    here.channels().then((r) => setChannels(r.channels)).catch((e) => setError(String(e)));
  }, []);

  const post = async () => {
    if (!body.trim() || !picked.length) return;
    try {
      setResult(await here.queuePost(picked, body));
      setBody("");
    } catch (e) {
      setError(String(e));
    }
  };

  if (error) return <p style={box("#fdecee", "#a3202f")}>{error}</p>;
  if (!channels) return <p style={{ fontSize: 11, color: "#8a929e" }}>Loading…</p>;

  return (
    <>
      <section className="pipeline-panel" style={{ marginBottom: 12 }}>
        <div className="panel-head">
          <div>
            <span>POST FROM THE SITE</span>
            <h2>Queue a post.</h2>
          </div>
          <button style={{ ...miniBtn, background: BLUE, color: "#fff" }} onClick={post}>
            Queue
          </button>
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="What went down today."
          style={{ ...inputStyle, marginTop: 0, width: "100%", resize: "vertical" }}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {channels.map((c) => (
            <button
              key={c.key}
              onClick={() => setPicked((p) => (p.includes(c.key) ? p.filter((k) => k !== c.key) : [...p, c.key]))}
              disabled={!c.postable}
              title={c.postable ? c.label : c.blockers.join("; ")}
              style={{
                ...miniBtn,
                opacity: c.postable ? 1 : 0.4,
                cursor: c.postable ? "pointer" : "not-allowed",
                background: picked.includes(c.key) ? BLUE : "#eef1f5",
                color: picked.includes(c.key) ? "#fff" : "#596576",
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {result && (
          <div style={{ marginTop: 12 }}>
            {result.queued.length > 0 && (
              <p style={box("#e2f3eb", "#087452")}>Queued to {result.queued.join(", ")}.</p>
            )}
            {result.refused.map((r) => (
              <p key={r.channel} style={box("#fff4e5", "#8a5a00")}>
                <b>{r.channel}</b> — {r.why}
              </p>
            ))}
          </div>
        )}
      </section>

      <section className="pipeline-panel">
        <div className="panel-head">
          <div>
            <span>CONNECTIONS</span>
            <h2>What is actually wired.</h2>
          </div>
        </div>
        <div className="lane-table">
          {channels.map((c) => (
            <article key={c.key} style={{ display: "block", padding: "14px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <b style={{ fontSize: 11 }}>{c.label}</b>
                <span style={{ fontSize: 8, fontWeight: 900, color: c.postable ? "#087452" : "#98701f" }}>
                  {c.postable ? "READY" : "NOT CONNECTED"}
                </span>
              </div>
              {!c.postable && (
                <p style={{ fontSize: 9, lineHeight: 1.6, color: "#8a929e", margin: "6px 0 0" }}>
                  {c.blockers.join(" · ")}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

/* ─────────────────────────── bits ─────────────────────────── */

const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 7, marginTop: 14 };

const inputStyle: React.CSSProperties = {
  border: "1px solid #d9d6ce",
  borderRadius: 13,
  background: "#fff",
  padding: 13,
  fontSize: 12,
  color: "#121d2d",
  outline: "none",
  marginTop: 6,
};

const miniBtn: React.CSSProperties = {
  border: 0,
  borderRadius: 9,
  background: "#eef1f5",
  color: "#596576",
  padding: "9px 11px",
  fontSize: 9,
  fontWeight: 900,
  cursor: "pointer",
};

const sendBtn: React.CSSProperties = {
  border: 0,
  borderRadius: 13,
  background: NAVY,
  color: "#fff",
  padding: "0 20px",
  fontSize: 11,
  fontWeight: 900,
  cursor: "pointer",
};

function box(bg: string, fg: string): React.CSSProperties {
  return {
    background: bg,
    color: fg,
    borderRadius: 10,
    padding: "11px 13px",
    fontSize: 10,
    lineHeight: 1.6,
    margin: "12px 0 0",
  };
}

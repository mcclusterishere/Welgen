"use client";

import { useCallback, useEffect, useState } from "react";
import {
  backendConfigured,
  changePassword,
  loadSession,
  NotSignedIn,
  requestPasswordReset,
  signIn,
  signOut,
  type Session,
} from "@/lib/here";
import SiteEditor from "./site-editor";

type Tab = "site" | "account";
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
  if (!ready) return <main style={{ minHeight: "100vh", background: "#f4f6f8" }} />;
  if (!session) return <SignIn onSignedIn={setSession} />;
  return <Console session={session} onSignedOut={onSignedOut} />;
}

function SignIn({ onSignedIn }: { onSignedIn: (s: Session) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sentReset, setSentReset] = useState(false);
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
  const forgot = async () => {
    if (!email.trim()) return setError("Type your email address first, then tap reset.");
    setError("");
    await requestPasswordReset(email.trim());
    setSentReset(true);
  };
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: NAVY, padding: 24 }}>
      <form onSubmit={submit} style={{ width: "min(100%, 400px)", background: "#fff", borderRadius: 20, padding: "38px 34px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 26 }}>
          <span style={{ display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: 12, background: BLUE, color: "#fff", fontSize: 12, fontWeight: 900 }}>JJ</span>
          <div><b style={{ fontSize: 12, letterSpacing: 1 }}>JAY JOHNSON</b><small style={{ display: "block", fontSize: 8, letterSpacing: 1.5, color: "#7f8ca2", marginTop: 3 }}>HIS BACKEND</small></div>
        </div>
        <h1 style={{ font: "400 30px/1 Georgia, serif", margin: "0 0 22px" }}>Sign in.</h1>
        {!backendConfigured && <p>This build has no backend configured.</p>}
        <label style={{ display: "grid", gap: 7, marginTop: 14 }}>Email<input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} /></label>
        <label style={{ display: "grid", gap: 7, marginTop: 14 }}>Password<input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} /></label>
        {error && <p style={{ color: "#a3202f" }}>{error}</p>}
        <button type="submit" disabled={busy || !backendConfigured} style={{ width: "100%", marginTop: 20, border: 0, borderRadius: 13, background: NAVY, color: "#fff", padding: 15, fontWeight: 900 }}>{busy ? "Signing in…" : "Sign in"}</button>
        <button type="button" onClick={forgot} style={{ border: 0, background: "none", color: BLUE, marginTop: 14, fontWeight: 700 }}>Forgot your password?</button>
        {sentReset && <p>If that address has an account, a reset link is on its way.</p>}
        <p style={{ fontSize: 10, color: "#959189", marginTop: 16 }}>Accounts are created by the studio. There is no public sign-up.</p>
      </form>
    </main>
  );
}

function Console({ session, onSignedOut }: { session: Session; onSignedOut: () => void }) {
  const [tab, setTab] = useState<Tab>("site");
  return (
    <main className="dashboard-shell">
      <aside className="dash-sidebar">
        <a className="dash-brand" href="/"><span>JJ</span><div><b>JAY JOHNSON</b><small>HIS BACKEND</small></div></a>
        <nav>
          <a href="#site" className={tab === "site" ? "active" : ""} onClick={(e) => { e.preventDefault(); setTab("site"); }}><i>✎</i>Site</a>
          <a href="#account" className={tab === "account" ? "active" : ""} onClick={(e) => { e.preventDefault(); setTab("account"); }}><i>☉</i>Account</a>
          <a href="/dashboard"><i>⌂</i>Dashboard</a>
        </nav>
        <div className="dash-profile"><div><b>{session.user.email ?? "Signed in"}</b><span><button onClick={onSignedOut} style={{ border: 0, background: "none", color: "#79869b", padding: 0, cursor: "pointer" }}>Sign out</button></span></div></div>
      </aside>
      <div className="dash-main">
        <header className="dash-header"><div><span>MCCLUSTER SITES · ACTIVE</span><h1>{tab === "site" ? "Edit your site." : "Your account."}</h1></div></header>
        {tab === "site" && <SiteEditor />}
        {tab === "account" && <AccountPanel session={session} />}
      </div>
    </main>
  );
}

function AccountPanel({ session }: { session: Session }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setDone(false);
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("Those two do not match.");
    setBusy(true);
    try {
      await changePassword(password);
      setPassword("");
      setConfirm("");
      setDone(true);
    } catch (err) {
      setError(err instanceof NotSignedIn ? "Session expired — sign in again." : String(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="pipeline-panel" style={{ maxWidth: 520 }}>
      <div className="panel-head"><div><span>SIGNED IN AS</span><h2>{session.user.email}</h2></div></div>
      <p style={{ fontSize: 11, lineHeight: 1.7, color: "#68738a" }}>Change your password here. Plan: McCluster Sites · Web is active.</p>
      <form onSubmit={submit}>
        <label style={{ display: "grid", gap: 7 }}>New password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} /></label>
        <label style={{ display: "grid", gap: 7, marginTop: 14 }}>Type it again<input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={inputStyle} /></label>
        {error && <p style={{ color: "#a3202f" }}>{error}</p>}
        {done && <p style={{ color: "#087452" }}>Password changed.</p>}
        <button type="submit" disabled={busy} style={{ marginTop: 18, width: "100%", border: 0, borderRadius: 13, background: NAVY, color: "#fff", padding: 14, fontWeight: 900 }}>{busy ? "Saving…" : "Change password"}</button>
      </form>
    </section>
  );
}

const inputStyle: React.CSSProperties = { border: "1px solid #d9d6ce", borderRadius: 13, background: "#fff", padding: 13, fontSize: 12, color: "#121d2d", outline: "none" };

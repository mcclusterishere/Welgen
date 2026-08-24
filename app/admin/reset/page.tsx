"use client";

/**
 * Where a password-recovery email lands.
 *
 * Supabase sends the reader here with the session in the URL *fragment*
 * (`#access_token=…&type=recovery`). A fragment never leaves the browser
 * — it is not sent to any server and does not appear in server logs —
 * which is the whole reason the token is carried there rather than in a
 * query string. The page reads it, sets the new password, and strips it
 * from the address bar so it does not sit in history.
 *
 * The site is a static export, so all of this is client-side. There is
 * no server here to hand the token to anyway.
 */

import { useEffect, useState } from "react";
import { setPasswordWithToken } from "@/lib/here";

const NAVY = "#0b1629";

type Phase = "reading" | "ready" | "saved" | "broken";

export default function ResetPage() {
  const [phase, setPhase] = useState<Phase>("reading");
  const [token, setToken] = useState("");
  const [problem, setProblem] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    const params = new URLSearchParams(hash);

    const err = params.get("error_description") || params.get("error");
    if (err) {
      // Recovery links are single-use and time-limited; an expired one
      // is the most common way to arrive here.
      setProblem(err.replace(/\+/g, " "));
      setPhase("broken");
      return;
    }

    const at = params.get("access_token");
    if (!at) {
      setProblem("This page needs to be opened from the link in the reset email.");
      setPhase("broken");
      return;
    }

    setToken(at);
    setPhase("ready");
    // Take the token out of the address bar so it is not left in history
    // or leaked by a shared screenshot.
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("Those two do not match.");

    setBusy(true);
    try {
      await setPasswordWithToken(token, password);
      setPhase("saved");
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={shell}>
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 24 }}>
          <span style={mark}>JJ</span>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <b style={{ fontSize: 12, letterSpacing: 1 }}>JAY JOHNSON</b>
            <small style={{ fontSize: 8, letterSpacing: 1.5, color: "#7f8ca2", marginTop: 3 }}>OPERATIONS</small>
          </div>
        </div>

        {phase === "reading" && <p style={{ fontSize: 12, color: "#68738a" }}>Checking your link…</p>}

        {phase === "broken" && (
          <>
            <h1 style={h1}>That link didn&apos;t work.</h1>
            <p style={note}>{problem}</p>
            <p style={{ ...note, marginTop: 12 }}>
              Reset links expire and can only be used once. Ask for a fresh one from the sign-in
              page.
            </p>
            <a href="/admin/" style={{ ...button, display: "block", textAlign: "center", textDecoration: "none", marginTop: 20 }}>
              Back to sign in
            </a>
          </>
        )}

        {phase === "saved" && (
          <>
            <h1 style={h1}>Password changed.</h1>
            <p style={note}>You can sign in with it now.</p>
            <a href="/admin/" style={{ ...button, display: "block", textAlign: "center", textDecoration: "none", marginTop: 20 }}>
              Go to sign in
            </a>
          </>
        )}

        {phase === "ready" && (
          <form onSubmit={submit}>
            <h1 style={h1}>Set a new password.</h1>
            <label style={label}>
              <span>New password</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={input}
              />
            </label>
            <label style={label}>
              <span>Type it again</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                style={input}
              />
            </label>
            {error && <p style={errBox}>{error}</p>}
            <button type="submit" disabled={busy} style={{ ...button, marginTop: 20, opacity: busy ? 0.6 : 1 }}>
              {busy ? "Saving…" : "Save password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

const shell: React.CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  background: NAVY,
  padding: 24,
  fontFamily: "Arial, Helvetica, sans-serif",
};
const card: React.CSSProperties = {
  width: "min(100%, 400px)",
  background: "#fff",
  borderRadius: 20,
  padding: "38px 34px",
};
const mark: React.CSSProperties = {
  display: "grid",
  placeItems: "center",
  width: 40,
  height: 40,
  borderRadius: 12,
  background: "#3157d5",
  color: "#fff",
  fontSize: 12,
  fontWeight: 900,
};
const h1: React.CSSProperties = { font: "400 28px/1.1 Georgia, serif", margin: "0 0 16px" };
const note: React.CSSProperties = { fontSize: 12, lineHeight: 1.7, color: "#68738a", margin: 0 };
const label: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 7, marginTop: 14 };
const input: React.CSSProperties = {
  border: "1px solid #d9d6ce",
  borderRadius: 13,
  background: "#fff",
  padding: 13,
  fontSize: 12,
  color: "#121d2d",
  outline: "none",
  marginTop: 6,
};
const button: React.CSSProperties = {
  width: "100%",
  border: 0,
  borderRadius: 13,
  background: NAVY,
  color: "#fff",
  padding: "15px 16px",
  fontSize: 12,
  fontWeight: 900,
  cursor: "pointer",
};
const errBox: React.CSSProperties = {
  background: "#fdecee",
  color: "#a3202f",
  borderRadius: 10,
  padding: "11px 13px",
  fontSize: 10,
  lineHeight: 1.6,
  margin: "12px 0 0",
};

"use client";

import { useEffect, useMemo, useState } from "react";
import { submitIntake } from "@/lib/here";

const FORM_DR = "https://app.formdr.com/practice/NDA4MjA=/form/4SwPxMEauV-yK4wEmZP39IJPxbZ0H4wk";
const WELGEN = "https://welgenone.com/";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type Tab = "wellness" | "jay" | "connect";
type Role = "support" | "helper" | "partner" | "";

const roleOptions = [
  { id: "support" as Role, icon: "♡", title: "I need support", note: "Help me find the right next step" },
  { id: "helper" as Role, icon: "↗", title: "I want to help", note: "Give time, resources or a connection" },
  { id: "partner" as Role, icon: "◎", title: "I represent an organization", note: "Build a referral or community partnership" },
];

const needOptions: Record<Exclude<Role, "">, string[]> = {
  support: ["Health & wellness", "Housing", "Court navigation", "Food & essentials", "Employment", "Something else"],
  helper: ["Volunteer time", "Donate resources", "Introduce a partner", "Host an event", "Share expertise", "Sponsor a need"],
  partner: ["Court referral partner", "Community organization", "Corporate sponsor", "Real estate / wholesale", "Wellness provider", "Program ambassador"],
};

function AppIcon({ name }: { name: Tab | "spark" | "arrow" | "check" }) {
  if (name === "wellness") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-8-4.7-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.3-8 11-8 11Z"/><path d="M8 12h2l1.2-2.3L13 14l1-2h2"/></svg>;
  if (name === "jay") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2"/><path d="M5.5 20c.7-4 3-6 6.5-6s5.8 2 6.5 6"/></svg>;
  if (name === "connect") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17.5 3.5 20l1-4A7.5 7.5 0 1 1 7 17.5Z"/><path d="M8 9h8M8 13h5"/></svg>;
  if (name === "check") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>;
  if (name === "arrow") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 1.5 5.1L19 9l-5.5 1.8L12 16l-1.5-5.2L5 9l5.5-1.9L12 2Z"/></svg>;
}

export default function JayApp() {
  const [tab, setTab] = useState<Tab>("jay");
  const [water, setWater] = useState(3);
  const [mood, setMood] = useState("");
  const [role, setRole] = useState<Role>("");
  const [needs, setNeeds] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [note, setNote] = useState("");
  const [installPrompt, setInstallPrompt] = useState<(Event & { prompt: () => Promise<void> }) | null>(null);
  const [installHelp, setInstallHelp] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    if (requestedTab === "wellness" || requestedTab === "connect" || requestedTab === "jay") setTab(requestedTab);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register(`${BASE_PATH}/sw.js`, { scope: `${BASE_PATH}/` }).catch(() => undefined);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as Event & { prompt: () => Promise<void> });
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const summary = useMemo(() => {
    const roleLabel = roleOptions.find((item) => item.id === role)?.title ?? "Connection request";
    return `Jay Johnson Connect
${roleLabel}
Needs / interests: ${needs.join(", ") || "Not selected"}
Name: ${name || "Not provided"}
Contact: ${contact || "Not provided"}
Note: ${note || "None"}`;
  }, [role, needs, name, contact, note]);

  const chooseRole = (selected: Role) => {
    setRole(selected);
    setNeeds([]);
    setStep(1);
  };

  const toggleNeed = (need: string) => setNeeds((current) => current.includes(need) ? current.filter((item) => item !== need) : [...current, need]);
  const restart = () => { setRole(""); setNeeds([]); setStep(0); setName(""); setContact(""); setNote(""); setCopied(false); };

  /**
   * Sends the request to the Here backend, then advances regardless.
   *
   * The visitor always reaches the confirmation screen: the summary they
   * can copy and share is generated on-device and is useful whether or
   * not the network cooperated. Someone asking for help should never be
   * shown a failure for a problem on our side.
   */
  const sendRequest = async () => {
    setStep(3);
    const result = await submitIntake({
      name,
      contact,
      note,
      needs,
      kind: role === "partner" ? "partnership" : role === "helper" ? "volunteer" : "help",
      page: "/app",
    });
    if (!result.ok) console.warn("intake did not reach the backend:", result.error);
  };

  const shareRequest = async () => {
    if (navigator.share) {
      await navigator.share({ title: "Jay Johnson Connect", text: summary }).catch(() => undefined);
    } else {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
    }
  };

  const changeTab = (next: Tab) => {
    setTab(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return <main className={`app-shell tab-${tab}`}>
    <div className="app-topbar">
      <div className="mini-brand"><span>JJ</span><div><b>JAY JOHNSON</b><small>Community connection</small></div></div>
      {installPrompt ? <button className="install-btn" onClick={async () => { await installPrompt.prompt(); setInstallPrompt(null); }}>Install app <span>↓</span></button> : <button className="install-btn" onClick={() => setInstallHelp(true)}>Add to phone <span>＋</span></button>}
    </div>

    {installHelp && <div className="install-overlay" role="dialog" aria-modal="true" aria-labelledby="install-title" onClick={() => setInstallHelp(false)}>
      <div className="install-sheet" onClick={(event) => event.stopPropagation()}>
        <span className="sheet-grab" />
        <button className="sheet-close" onClick={() => setInstallHelp(false)} aria-label="Close">×</button>
        <span className="install-app-icon">JJ</span>
        <p className="section-kicker">INSTALL JAY CONNECT</p>
        <h2 id="install-title">Keep the app one tap away.</h2>
        <ol><li><span>1</span>Open this page in Safari.</li><li><span>2</span>Tap the Share button.</li><li><span>3</span>Choose <b>Add to Home Screen</b>.</li></ol>
        <button className="continue-btn" onClick={() => setInstallHelp(false)}>Got it <AppIcon name="check" /></button>
      </div>
    </div>}

    <div className="screen" aria-live="polite">
      {tab === "jay" && <section className="jay-screen" aria-labelledby="jay-title">
        <div className="profile-hero">
          <img src={`${BASE_PATH}/welgen-leadership.jpeg`} alt="Jay Johnson" />
          <div className="profile-shade" />
          <div className="profile-copy"><span className="profile-label">MEET JAY</span><h1 id="jay-title">Jay<br />Johnson</h1><p>Connector · Ambassador · Builder</p></div>
          <span className="chicago-chip">CHICAGO → ATLANTA</span>
        </div>

        <div className="profile-body">
          <div className="intro-card"><span className="quote-mark">“</span><p>Helping the general population at large starts with listening, making the right connection and staying close enough to see it through.</p></div>
          <div className="story-section">
            <p className="section-kicker">HIS STORY</p>
            <h2>Built by family.<br />Moved by people.</h2>
            <p>Jay is from Chicago and grew up as one of ten children—six boys and four girls. That big-family foundation taught him how to understand different personalities, share responsibility and show up for people.</p>
            <p>In 2023, he moved to Atlanta and began turning that instinct into a wider network of community, court, corporate and wellness relationships.</p>
          </div>

          <div className="timeline">
            <article><span>01</span><div><small>CHICAGO</small><h3>One of ten</h3><p>Raised in a family of six boys and four girls.</p></div></article>
            <article><span>02</span><div><small>2023</small><h3>Atlanta chapter</h3><p>Moved south to build new relationships and opportunity.</p></div></article>
            <article><span>03</span><div><small>NEXT</small><h3>Direct impact</h3><p>Aspiring to launch a nonprofit that can give assistance directly.</p></div></article>
          </div>

          <div className="building-section">
            <p className="section-kicker">WHAT HE&apos;S BUILDING</p>
            <div className="mission-cards">
              <article><span className="card-icon">⚖</span><div><h3>Court connections</h3><p>Partnering with courts and referral teams to help people navigate urgent needs.</p></div></article>
              <article><span className="card-icon">⌂</span><div><h3>Corporate & real estate</h3><p>Building corporate relationships around wholesale real estate and community opportunity.</p></div></article>
              <article><span className="card-icon">◎</span><div><h3>Community ambassador</h3><p>Representing organizations and helping their programs reach the communities they support.</p></div></article>
              <article><span className="card-icon">♡</span><div><h3>Future nonprofit</h3><p>Creating a vehicle to give direct assistance to people who need it most.</p></div></article>
            </div>
          </div>

          <button className="wide-action" onClick={() => changeTab("connect")}><span>Connect with Jay</span><AppIcon name="arrow" /></button>
        </div>
      </section>}

      {tab === "wellness" && <section className="wellness-screen" aria-labelledby="wellness-title">
        <div className="wellness-head"><div><p className="section-kicker green">WELLNESS</p><h1 id="wellness-title">How are you<br />feeling today?</h1></div><span className="wellness-orb"><AppIcon name="wellness" /></span></div>

        <div className="daily-card">
          <div><span className="live-dot" />DAILY CHECK-IN</div>
          <h2>Start with the basics.</h2>
          <p>Small check-ins help you notice patterns and ask better questions.</p>
          <div className="mood-row" role="group" aria-label="Mood check-in">
            {["Low", "Okay", "Good", "Great"].map((item, index) => <button key={item} className={mood === item ? "selected" : ""} onClick={() => setMood(item)}><span>{["◔","◑","◕","●"][index]}</span>{item}</button>)}
          </div>
        </div>

        <div className="metric-grid">
          <article className="water-card"><div className="metric-top"><span>WATER</span><b>{water}<small>/8</small></b></div><div className="water-dots">{Array.from({ length: 8 }).map((_, index) => <i key={index} className={index < water ? "filled" : ""} />)}</div><button onClick={() => setWater((value) => value >= 8 ? 0 : value + 1)}>Add a glass <span>＋</span></button></article>
          <article className="move-card"><div className="metric-top"><span>MOVE</span><b>12<small> min</small></b></div><div className="move-ring"><span>24%</span></div><p>Daily movement goal</p></article>
        </div>

        <div className="services-block">
          <div className="block-head"><div><p className="section-kicker green">WELGEN ONE</p><h2>Programs & care</h2></div><a href={WELGEN} target="_blank" rel="noreferrer">Official site ↗</a></div>
          <a className="service-feature" href={FORM_DR} target="_blank" rel="noreferrer"><div><span>START HERE</span><h3>Patient intake</h3><p>Begin the secure Welgen One intake and eligibility process.</p></div><i>↗</i></a>
          <div className="service-list">
            <article><span className="service-icon">✚</span><div><h3>WellScreen</h3><p>Preventive screening, biometrics and wellness insights.</p></div><i>›</i></article>
            <article><span className="service-icon">⌁</span><div><h3>Connected wellness</h3><p>Support designed around your health goals and next steps.</p></div><i>›</i></article>
            <article><span className="service-icon">◎</span><div><h3>Community events</h3><p>Bring mobile wellness access to your organization.</p></div><i>›</i></article>
          </div>
        </div>

        <div className="health-note"><b>Good to know</b><p>This wellness area offers general information and connections, not medical advice. For an emergency, call 911.</p></div>
      </section>}

      {tab === "connect" && <section className="connect-screen" aria-labelledby="connect-title">
        <h1 className="sr-only" id="connect-title">Connect with Jay Johnson</h1>
        <div className="connect-head"><span className="chat-avatar">JJ</span><div><small>JAY CONNECT</small><b>Let&apos;s find the right lane.</b></div><span className="secure-dot">PRIVATE</span></div>
        <div className="progress-track"><i style={{ width: `${Math.max(12, (step + 1) * 25)}%` }} /></div>

        <div className="chat-window">
          {step === 0 && <>
            <div className="chat-bubble"><span>Hey, I&apos;m Jay.</span><p>What brings you here today?</p></div>
            <div className="choice-stack">{roleOptions.map((option) => <button key={option.id} onClick={() => chooseRole(option.id)}><i>{option.icon}</i><div><b>{option.title}</b><span>{option.note}</span></div><em>›</em></button>)}</div>
            <p className="privacy-copy">Choose the closest fit. You can explain more before sharing anything.</p>
          </>}

          {step === 1 && role && <>
            <button className="back-btn" onClick={() => setStep(0)}>‹ Back</button>
            <div className="chat-bubble"><span>Got it.</span><p>{role === "support" ? "What kind of support would help most?" : role === "helper" ? "How would you like to contribute?" : "What kind of partnership are you exploring?"}</p><small>Select all that apply.</small></div>
            <div className="need-grid">{needOptions[role].map((item) => <button key={item} className={needs.includes(item) ? "selected" : ""} onClick={() => toggleNeed(item)}><span>{needs.includes(item) && <AppIcon name="check" />}</span>{item}</button>)}</div>
            <button className="continue-btn" disabled={!needs.length} onClick={() => setStep(2)}>Continue <AppIcon name="arrow" /></button>
          </>}

          {step === 2 && <>
            <button className="back-btn" onClick={() => setStep(1)}>‹ Back</button>
            <div className="chat-bubble"><span>Last step.</span><p>How can the right person follow up?</p></div>
            <form className="intake-form" onSubmit={(event) => { event.preventDefault(); sendRequest(); }}>
              <label><span>Your name</span><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="First and last name" /></label>
              <label><span>Phone or email</span><input required value={contact} onChange={(event) => setContact(event.target.value)} placeholder="Best way to reach you" /></label>
              <label><span>Anything we should know? <i>Optional</i></span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Keep it brief—no private medical or legal details." rows={4} /></label>
              <p className="form-note">Your request goes straight to Jay&apos;s desk. Please keep out private medical or legal details.</p>
              <button className="continue-btn" type="submit">Review my request <AppIcon name="arrow" /></button>
            </form>
          </>}

          {step === 3 && <div className="success-state">
            <span className="success-icon"><AppIcon name="check" /></span><p className="section-kicker">READY TO SHARE</p><h2>Your connection brief is ready.</h2>
            <div className="request-summary"><b>{roleOptions.find((item) => item.id === role)?.title}</b><span>{needs.join(" · ")}</span><p>{name}<br />{contact}</p>{note && <small>“{note}”</small>}</div>
            <button className="continue-btn" onClick={shareRequest}>{copied ? "Copied" : "Share or copy request"} <AppIcon name="arrow" /></button>
            {role === "support" && needs.includes("Health & wellness") && <a className="welgen-handoff" href={FORM_DR} target="_blank" rel="noreferrer">Continue to Welgen patient intake ↗</a>}
            <button className="restart-btn" onClick={restart}>Start over</button>
          </div>}
        </div>
      </section>}
    </div>

    <nav className="bottom-tabs" role="tablist" aria-label="App sections">
      <button role="tab" aria-selected={tab === "wellness"} className={tab === "wellness" ? "active" : ""} onClick={() => changeTab("wellness")}><AppIcon name="wellness" /><span>Wellness</span></button>
      <button role="tab" aria-selected={tab === "jay"} className={tab === "jay" ? "active center-tab" : "center-tab"} onClick={() => changeTab("jay")}><span className="jay-tab-icon"><AppIcon name="jay" /></span><span>Jay</span></button>
      <button role="tab" aria-selected={tab === "connect"} className={tab === "connect" ? "active" : ""} onClick={() => changeTab("connect")}><AppIcon name="connect" /><span>Connect</span></button>
    </nav>
  </main>;
}

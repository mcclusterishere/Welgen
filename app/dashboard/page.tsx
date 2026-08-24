const lanes = [
  { label: "Court & referral partners", status: "Build list", color: "blue", note: "Identify courts, public defenders and referral coordinators." },
  { label: "Community organizations", status: "Outreach ready", color: "green", note: "Position Jay as an ambassador for active programs." },
  { label: "Corporate & real estate", status: "Developing", color: "orange", note: "Wholesale relationships, sponsors and resource partners." },
  { label: "Welgen One wellness", status: "Active lane", color: "purple", note: "Patient-intake and community-wellness handoff is live." },
];

export default function DashboardPage() {
  return <main className="dashboard-shell">
    <aside className="dash-sidebar">
      <a className="dash-brand" href="/"><span>JJ</span><div><b>JAY JOHNSON</b><small>OPERATIONS</small></div></a>
      <nav><a className="active" href="#overview"><i>⌂</i>Overview</a><a href="#pipeline"><i>⇄</i>Connections</a><a href="#partners"><i>◎</i>Partnerships</a><a href="/app"><i>♡</i>Jay Connect app</a></nav>
      <div className="dash-profile"><img src="/welgen-leadership.jpeg" alt="" /><div><b>Jay Johnson</b><span>Community connector</span></div><i>•••</i></div>
    </aside>

    <div className="dash-main">
      <header className="dash-header"><div><span>CLIENT DASHBOARD</span><h1>Good afternoon, Jay.</h1></div><div><a href="/">View public page ↗</a><button>＋ New connection</button></div></header>
      <section className="dash-overview" id="overview">
        <div className="dash-focus"><div><span>THIS WEEK&apos;S FOCUS</span><h2>Build the first verified partner list.</h2><p>Start with court and community organizations that already handle health, housing, legal and essential-needs referrals.</p></div><div className="focus-ring"><span>01</span><small>Priority</small></div></div>
        <div className="metric-row"><article><span>Connection lanes</span><b>4</b><small>Defined and ready</small></article><article><span>Live resources</span><b>2</b><small>Public page + app</small></article><article><span>Intake pathways</span><b>3</b><small>Help · volunteer · partner</small></article><article><span>Wellness handoff</span><b className="text-status">LIVE</b><small>Welgen intake active</small></article></div>
      </section>

      <section className="dash-grid">
        <div className="pipeline-panel" id="pipeline"><div className="panel-head"><div><span>RELATIONSHIP PIPELINE</span><h2>Four active lanes</h2></div><button>View all</button></div><div className="lane-table">{lanes.map((lane) => <article key={lane.label}><i className={lane.color} /><div><b>{lane.label}</b><p>{lane.note}</p></div><span>{lane.status}</span><em>›</em></article>)}</div></div>
        <div className="actions-panel"><div className="panel-head"><div><span>QUICK ACTIONS</span><h2>Keep moving</h2></div></div><a href="/app?tab=connect"><i>＋</i><div><b>Open connection intake</b><span>Review the public flow</span></div><em>↗</em></a><a href="https://app.formdr.com/practice/NDA4MjA=/form/4SwPxMEauV-yK4wEmZP39IJPxbZ0H4wk" target="_blank" rel="noreferrer"><i>♡</i><div><b>Welgen patient intake</b><span>Open secure form</span></div><em>↗</em></a><a href="/"><i>□</i><div><b>Share public profile</b><span>Client-ready link</span></div><em>↗</em></a></div>
      </section>

      <section className="next-plan" id="partners"><div><span>NEXT BUILD</span><h2>Turn the dashboard into a live operation.</h2><p>Connect Jay&apos;s preferred email or phone, then add a secure database so requests and partner records can appear here automatically.</p></div><div className="plan-steps"><span className="done">✓ Public profile</span><span className="done">✓ Three-tab PWA</span><span>○ Intake destination</span><span>○ Partner CRM</span></div></section>
    </div>
  </main>;
}

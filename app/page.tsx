const registerUrl = "https://patientportal.advancedmd.com/";
const programs = [
  { n: "01", title: "WellScreen", tag: "Preventive screening", text: "Mobile, community-based screenings, biometrics and wellness insights—brought directly to neighborhoods, workplaces and partner events." },
  { n: "02", title: "WellSure", tag: "Connected support", text: "Remote patient monitoring designed to extend support beyond an appointment and help care teams stay connected to patient progress." },
  { n: "03", title: "WellCorp", tag: "Workplace wellness", text: "Flexible onsite wellness programming for employers and organizations that want to make preventive care easier to access." },
  { n: "04", title: "Wellness Care", tag: "Whole-person care", text: "Personalized consultations, diagnostic insights and wellness guidance built around each person’s history and goals." },
];
const services = ["Allergy testing", "Diagnostic testing", "Biometrics", "Medical consultation", "IV therapy & B12", "Dietitian & life coaching", "Genetic insights", "Community home care"];

export default function Home() {
  return <main>
    <header className="nav-wrap">
      <a className="brand" href="#top" aria-label="Welgen One home"><span className="brand-mark">W1</span><span>Welgen <b>One</b></span></a>
      <nav aria-label="Primary navigation"><a href="#programs">Programs</a><a href="#how">How it works</a><a href="#about">About</a><a href="#contact">Contact</a></nav>
      <a className="button small" href={registerUrl} target="_blank" rel="noreferrer">Pre-register <span>↗</span></a>
    </header>

    <section className="hero" id="top">
      <div className="hero-copy">
        <p className="eyebrow"><span /> Mobile wellness · Atlanta, Georgia</p>
        <h1>Better health should<br />meet you <em>where you are.</em></h1>
        <p className="lede">Welgen One brings preventive screenings, personalized wellness insights and connected care directly to people, workplaces and communities.</p>
        <div className="hero-actions"><a className="button" href={registerUrl} target="_blank" rel="noreferrer">Start your wellness journey <span>↗</span></a><a className="text-link" href="#programs">Explore our programs <span>↓</span></a></div>
        <div className="trust-row"><div><b>20+</b><span>Partner facilities</span></div><div><b>4</b><span>States served</span></div><div><b>50+</b><span>Affiliates</span></div></div>
      </div>
      <div className="hero-visual">
        <img src="/community-leadership.jpeg" alt="Welgen One community leader at a local event" />
        <div className="hero-card"><span className="pulse" /><div><small>Our care model</small><b>Preventive. Personal. Mobile.</b></div></div>
        <div className="orbit orbit-one" /><div className="orbit orbit-two" />
      </div>
    </section>

    <section className="intro" id="programs">
      <div><p className="eyebrow dark"><span /> One connected wellness platform</p><h2>Care that moves<br />with your life.</h2></div>
      <p>Traditional care can feel fragmented. Welgen One brings essential health information, clinical guidance and ongoing support into a simpler, community-first experience.</p>
    </section>
    <section className="program-grid">
      {programs.map((p) => <article className="program" key={p.title}><span className="program-num">{p.n}</span><div><p>{p.tag}</p><h3>{p.title}</h3><p className="program-text">{p.text}</p></div><span className="program-arrow">↗</span></article>)}
    </section>

    <section className="services">
      <div className="services-copy"><p className="eyebrow"><span /> Wellness services</p><h2>A clearer view of<br />your whole health.</h2><p>Services may vary by location, event, clinical eligibility and provider availability. Our team can help identify the right next step.</p><a className="button light" href="tel:+18664119354">Call 866-411-WELGEN <span>↗</span></a></div>
      <div className="service-list">{services.map((s, i) => <div key={s}><span>{String(i + 1).padStart(2, "0")}</span><b>{s}</b><span>＋</span></div>)}</div>
    </section>

    <section className="process" id="how">
      <div className="section-head"><div><p className="eyebrow dark"><span /> The WellScreen journey</p><h2>From registration<br />to real next steps.</h2></div></div>
      <div className="steps">
        <article><span>1</span><h3>Pre-register</h3><p>Submit your information through the secure patient portal for eligibility and insurance review.</p></article>
        <article><span>2</span><h3>Schedule</h3><p>Choose an appointment and complete your consent and health history forms online.</p></article>
        <article><span>3</span><h3>Get screened</h3><p>Complete your wellness and diagnostic screening with a clinical consultation.</p></article>
        <article><span>4</span><h3>Review results</h3><p>Receive results and recommended next steps, typically within about ten business days.</p></article>
      </div>
    </section>

    <section className="about" id="about">
      <div className="portrait"><img src="/welgen-leadership.jpeg" alt="Welgen One representative in Atlanta" /><div className="photo-label"><small>Built in Atlanta</small><b>Rooted in community.</b></div></div>
      <div className="about-copy"><p className="eyebrow"><span /> About Welgen One</p><h2>Healthcare access begins with trust.</h2><p>Welgen One was created to make personalized, preventive care more accessible—especially through churches, nonprofits, employers and community organizations.</p><p>Our mobile-first model meets people in familiar places, removes unnecessary barriers and makes prioritizing health feel possible.</p><blockquote>“Every customer. Every encounter. Every time.”</blockquote><a className="text-link light-link" href="#contact">Partner with Welgen One <span>→</span></a></div>
    </section>

    <section className="cta" id="contact"><p className="eyebrow dark"><span /> Your health, in motion</p><h2>Ready to begin?</h2><p>Pre-register online or speak with the Welgen One team about care, events and partnership opportunities.</p><div><a className="button" href={registerUrl} target="_blank" rel="noreferrer">Pre-register today <span>↗</span></a><a className="button outline" href="mailto:info@welgenone.com">Email our team</a></div></section>

    <footer><div className="footer-top"><a className="brand footer-brand" href="#top"><span className="brand-mark">W1</span><span>Welgen <b>One</b></span></a><p>Personalized wellness.<br />Delivered differently.</p><div><a href="tel:+17702120015">770.212.0015</a><a href="mailto:info@welgenone.com">info@welgenone.com</a></div></div><div className="footer-bottom"><span>309 E. Paces Ferry NE, Suite 400, Atlanta, GA 30305</span><span>© 2026 Welgen Global Enterprises LLC.</span><span>Healthcare services are subject to clinical eligibility and availability.</span></div></footer>
  </main>;
}

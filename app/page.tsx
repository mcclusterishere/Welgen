const formDrUrl = "https://app.formdr.com/practice/NDA4MjA=/form/4SwPxMEauV-yK4wEmZP39IJPxbZ0H4wk";
const welgenUrl = "https://welgenone.com/";

const lanes = [
  { number: "01", title: "Community Content", kicker: "Real people. Real moments.", text: "Street-level conversations and acts of kindness captured naturally—content that creates attention without losing the humanity in the moment.", action: "See the content model" },
  { number: "02", title: "Nonprofit Ambassador", kicker: "A trusted face on the ground.", text: "Jay represents mission-driven organizations in the community, helping their work reach the people, partners and audiences it was built to serve.", action: "Explore partnerships" },
  { number: "03", title: "Wellness Access", kicker: "Welgen One representative.", text: "As an independent community representative for Welgen One, Jay connects people with mobile wellness information, screenings and the proper patient-intake path.", action: "View Welgen services" },
  { number: "04", title: "Live & Brand Activations", kicker: "Show the work as it happens.", text: "Live coverage, community appearances and on-camera activations designed for organizations that need authentic presence—not another generic ad.", action: "Plan an activation" },
];

const partnershipOptions = [
  { title: "Community Feature", text: "Place your mission inside authentic community content and real conversations." },
  { title: "Ongoing Representation", text: "Make Jay a consistent, recognizable community representative for your organization." },
  { title: "Custom Activation", text: "Build an event, wellness day, live broadcast or campaign around a specific goal." },
];

export default function Home() {
  return <main>\n    <section className="jay-hero" id="top">
      <div className="hero-index"><span>ATL</span><span>COMMUNITY / MEDIA / WELLNESS</span><span>2026</span></div>
      <div className="jay-hero-copy">
        <p className="overline"><i /> Jay Johnson · Atlanta, Georgia</p>
        <h1>Multiple lanes.<br /><em>One mission.</em></h1>
        <p className="hero-lede">Jay turns relationships, visibility and real community presence into opportunity—for people, nonprofits and brands.</p>
        <div className="hero-buttons"><a className="primary-btn" href="#work">Explore Jay&apos;s work <span>↓</span></a><a className="line-btn" href="#partner">Build a partnership <span>↗</span></a></div>
      </div>
      <div className="jay-portrait">
        <div className="portrait-frame"><img src="/welgen-leadership.jpeg" alt="Jay Johnson in Atlanta" /></div>
        <div className="portrait-tag"><span>COMMUNITY CONNECTOR</span><b>Jay Johnson</b></div>
        <div className="red-line" />
      </div>
      <p className="vertical-copy">ON THE GROUND · ON CAMERA · OPENING DOORS</p>
    </section>

    <section className="statement">
      <p>More than a personal brand.</p>
      <h2>A platform for every way<br />Jay moves people <em>forward.</em></h2>
      <div className="statement-note"><span>THE MODEL</span><p>Build trust in public. Connect people to real resources. Create content that carries the story further.</p></div>
    </section>

    <section className="work" id="work">
      <div className="section-title"><p className="overline light"><i /> The work</p><h2>Four lanes.<br />One ecosystem.</h2><span className="section-count">01 — 04</span></div>
      <div className="lane-list">
        {lanes.map((lane) => <article className="lane" key={lane.number}>
          <span className="lane-number">{lane.number}</span>
          <div><p>{lane.kicker}</p><h3>{lane.title}</h3><p className="lane-copy">{lane.text}</p></div>
          <a href={lane.number === "03" ? "#welgen" : lane.number === "02" ? "#partner" : "#mission"} aria-label={lane.action}>↗</a>
        </article>)}
      </div>
    </section>

    <section className="welgen" id="welgen">
      <div className="welgen-brand"><span className="w-mark">W1</span><span>REPRESENTING</span><b>WELGEN ONE</b></div>
      <div className="welgen-main">
        <p className="overline welgen-eye"><i /> One of Jay&apos;s business lanes</p>
        <h2>Wellness that meets<br />people where they are.</h2>
        <p>Jay serves as a community representative connecting people and organizations to Welgen One&apos;s mobile wellness ecosystem. This is one part of Jay&apos;s broader work—not the identity of the entire site.</p>
        <div className="welgen-actions"><a className="mint-btn" href={formDrUrl} target="_blank" rel="noreferrer">Open patient intake <span>↗</span></a><a className="welgen-link" href={welgenUrl} target="_blank" rel="noreferrer">Visit official Welgen One site <span>↗</span></a></div>
      </div>
      <div className="welgen-services">
        <div><span>01</span><b>WellScreen</b><p>Mobile preventive screening and biometrics.</p></div>
        <div><span>02</span><b>Wellness Care</b><p>Personalized consultation and wellness guidance.</p></div>
        <div><span>03</span><b>Community Access</b><p>Connections through events, employers and local partners.</p></div>
      </div>
      <p className="welgen-disclaimer">Welgen One is an independent healthcare organization. Services, eligibility and scheduling are handled through Welgen One and its clinical partners.</p>
    </section>

    <section className="mission" id="mission">
      <div className="mission-photo"><img src="/community-leadership.jpeg" alt="Jay Johnson connecting with people at a community event" /><div className="photo-stamp"><span>THE REAL WORK</span><b>People first.</b></div></div>
      <div className="mission-copy">
        <p className="overline light"><i /> The bigger picture</p>
        <h2>Attention is only useful when it opens a door.</h2>
        <p>Jay&apos;s street content, nonprofit relationships and wellness representation all support a larger goal: connect people to help, make good work visible and build a sustainable platform around community impact.</p>
        <div className="mission-pillars"><div><span>A</span><b>Capture the story</b></div><div><span>B</span><b>Connect the resource</b></div><div><span>C</span><b>Create the opportunity</b></div></div>
        <blockquote>“The camera gets attention. The relationship is what makes the difference.”</blockquote>
      </div>
    </section>

    <section className="partner" id="partner">
      <div className="partner-head"><p className="overline"><i /> Partnerships</p><h2>Put Jay&apos;s presence<br />behind your mission.</h2><p>For nonprofits, wellness organizations, community programs and values-aligned brands.</p></div>
      <div className="partner-grid">{partnershipOptions.map((item, index) => <article key={item.title}><span>0{index + 1}</span><h3>{item.title}</h3><p>{item.text}</p><a href="#contact">Let&apos;s build it <b>↗</b></a></article>)}</div>
    </section>

    <section className="contact" id="contact">
      <p className="overline centered"><i /> Start a conversation</p>
      <h2>One connection can<br />change the whole route.</h2>
      <p>Bring the mission. Jay brings the community presence, content instinct and willingness to do the work on the ground.</p>
      <div><a className="primary-btn" href={formDrUrl} target="_blank" rel="noreferrer">Welgen patient intake <span>↗</span></a><a className="line-btn dark-line" href="#top">Back to the top <span>↑</span></a></div>
    </section>

    <footer>
      <div className="footer-brand"><a className="jay-logo" href="#top"><span>JJ</span><b>JAY JOHNSON</b></a><p>Community. Content. Opportunity.</p></div>
      <div className="footer-nav"><b>EXPLORE</b><a href="#work">The work</a><a href="#welgen">Welgen One</a><a href="#mission">The mission</a><a href="#partner">Partnerships</a></div>
      <div className="footer-place"><b>BASED IN</b><p>Decatur / Atlanta<br />Georgia</p></div>
      <div className="footer-bottom"><span>© 2026 Jay Johnson</span><span>Independent personal-business platform</span><span>Built for impact</span></div>
    </footer>
  </main>;
}

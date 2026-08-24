import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jay Johnson | Community Connector",
  description: "Meet Jay Johnson and explore his community, wellness, court-partner and corporate partnership work in Atlanta.",
};

const work = [
  { n: "01", title: "Community support", text: "Connecting people with organizations, services and individuals positioned to help." },
  { n: "02", title: "Wellness access", text: "Representing Welgen One programs and helping communities find the proper patient-intake path." },
  { n: "03", title: "Partner development", text: "Building relationships across courts, corporations, community organizations and wholesale real estate." },
];

export default function PublicPage() {
  return <main className="public-site">
    <header className="public-nav">
      <a className="public-logo" href="/"><span>JJ</span><b>JAY JOHNSON</b></a>
      <nav><a href="#about">About</a><a href="#work">The work</a><a href="/app">Wellness app</a></nav>
      <a className="public-nav-cta" href="/app?tab=connect">Connect <span>↗</span></a>
    </header>

    <section className="public-hero">
      <div className="hero-number">01 / PUBLIC PROFILE</div>
      <div className="public-hero-copy">
        <p className="public-kicker"><i /> CHICAGO ROOTS · ATLANTA WORK</p>
        <h1>Jay<br /><em>Johnson.</em></h1>
        <p>A community connector building pathways between people who need support and the institutions, programs and partners equipped to provide it.</p>
        <div><a className="public-primary" href="/app?tab=connect">Start a connection <span>↗</span></a><a className="public-secondary" href="/app">Open Jay Connect</a></div>
      </div>
      <div className="public-portrait"><img src="/welgen-leadership.jpeg" alt="Jay Johnson" /><span>CONNECTOR · AMBASSADOR · BUILDER</span></div>
    </section>

    <section className="public-intro" id="about">
      <p className="public-kicker dark"><i /> ABOUT JAY</p>
      <div><h2>Raised by a big family.<br />Driven by a bigger purpose.</h2><div className="intro-columns"><p>Jay is from Chicago and grew up as one of ten children—six boys and four girls. In a household that large, listening, adapting and showing up for others were part of everyday life.</p><p>He moved to Atlanta in 2023 with an interest in helping the general population at large. Today, he is building a network that can connect people with health resources, court partners, community programs and new economic opportunities.</p></div></div>
    </section>

    <section className="public-work" id="work">
      <div className="work-title"><p className="public-kicker light"><i /> THE PLATFORM</p><h2>Relationships that<br />move resources.</h2></div>
      <div className="work-list">{work.map((item) => <article key={item.n}><span>{item.n}</span><div><h3>{item.title}</h3><p>{item.text}</p></div><i>↗</i></article>)}</div>
    </section>

    <section className="public-story">
      <div className="story-image"><img src="/community-leadership.jpeg" alt="Jay Johnson at a community event" /></div>
      <div className="story-copy"><p className="public-kicker light"><i /> WHAT COMES NEXT</p><h2>A nonprofit built to help directly.</h2><p>Jay aspires to form a nonprofit capable of giving direct assistance while coordinating the right outside partner for needs the organization cannot handle alone.</p><ul><li><span>⚖</span>Court and referral partnerships</li><li><span>⌂</span>Corporate and wholesale real-estate relationships</li><li><span>◎</span>Community-program ambassadorships</li><li><span>♡</span>Direct public assistance</li></ul></div>
    </section>

    <section className="public-products">
      <div className="product-copy"><p className="public-kicker dark"><i /> TWO WAYS IN</p><h2>Explore the app.<br />See the operation.</h2></div>
      <a className="product-card app-card" href="/app"><span>FOR THE COMMUNITY</span><h3>Jay Connect</h3><p>Wellness resources, Jay&apos;s story and a guided way to ask for help, volunteer or partner.</p><b>Open the PWA ↗</b></a>
      <a className="product-card dash-card" href="/dashboard"><span>CLIENT VIEW</span><h3>Professional dashboard</h3><p>A clean operational overview of connections, programs, partnerships and next actions.</p><b>View dashboard ↗</b></a>
    </section>

    <section className="public-cta"><p>READY TO CONNECT?</p><h2>Bring the need.<br />Bring the resource.<br /><em>Let&apos;s build the bridge.</em></h2><a href="/app?tab=connect">Start here <span>↗</span></a></section>
    <footer className="public-footer"><a className="public-logo" href="/"><span>JJ</span><b>JAY JOHNSON</b></a><p>Community · Wellness · Connection</p><span>Atlanta, Georgia · © 2026</span></footer>
  </main>;
}

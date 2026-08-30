"use client";

import { useEffect, useState } from "react";
import "./jj.css";
import { defaultSite, loadPublishedSite, type SiteContent } from "@/lib/site";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const asset = (src: string) => (src.startsWith("http") ? src : `${BASE_PATH}${src}`);

export default function PublicPage() {
  const [site, setSite] = useState<SiteContent>(defaultSite);

  useEffect(() => {
    setSite(loadPublishedSite());
  }, []);

  return (
    <main className="jj">
      <header className="jj-nav">
        <a className="jj-logo" href={`${BASE_PATH}/`}>
          <span>{site.mark}</span>
          <b>{site.name}</b>
        </a>
        <nav>
          <a href="#about">About</a>
          <a href="#work">The work</a>
          <a href="#media">Media</a>
          <a href={`${BASE_PATH}/app`}>App</a>
        </nav>
        <div className="jj-nav-actions">
          <a className="jj-ghost" href={`${BASE_PATH}${site.membership.console}`}>Sign in</a>
          <a className="jj-solid" href={`${BASE_PATH}/app?tab=connect`}>Connect</a>
        </div>
      </header>

      <section className="jj-hero">
        <div className="jj-hero-copy">
          {site.membership.active && (
            <p className="jj-plan">
              Active on {site.membership.plan}
            </p>
          )}
          <p className="jj-kicker">{site.kicker}</p>
          <h1>
            {site.headline}
            <em> {site.headlineAccent}.</em>
          </h1>
          <p className="jj-lede">{site.lede}</p>
          <div className="jj-hero-ctas">
            <a className="jj-solid" href={`${BASE_PATH}/app?tab=connect`}>Start a connection</a>
            <a className="jj-ghost" href={`${BASE_PATH}/app`}>Open Jay Connect</a>
          </div>
        </div>
        <figure className="jj-portrait">
          <img src={asset(site.portrait)} alt={site.name} />
          <figcaption>Connector · Ambassador · Builder · {site.city}</figcaption>
        </figure>
      </section>

      <section className="jj-about" id="about">
        <p className="jj-kicker">About Jay</p>
        <h2>{site.aboutTitle}</h2>
        <div className="jj-cols">
          <p>{site.aboutLeft}</p>
          <p>{site.aboutRight}</p>
        </div>
      </section>

      <section className="jj-work" id="work">
        <div>
          <p className="jj-kicker light">The platform</p>
          <h2>{site.workTitle}</h2>
        </div>
        <ol>
          {site.work.map((item) => (
            <li key={item.n}>
              <span>{item.n}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="jj-next">
        <figure>
          <img src={asset(site.storyImage)} alt={`${site.name} at a community event`} />
        </figure>
        <div>
          <p className="jj-kicker light">What comes next</p>
          <h2>{site.nextTitle}</h2>
          <p>{site.nextBody}</p>
          <ul>
            {site.nextItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      {(site.photos.length > 0 || site.videos.length > 0) && (
        <section className="jj-media" id="media">
          <p className="jj-kicker">From the field</p>
          <h2>Photos and film.</h2>
          <div className="jj-media-grid">
            {site.videos.map((v) => (
              <video key={v.src} src={v.src} controls playsInline poster={asset(site.storyImage)} />
            ))}
            {site.photos.map((p) => (
              <img key={p.src} src={p.src} alt={p.alt || site.name} />
            ))}
          </div>
        </section>
      )}

      <section className="jj-doors">
        <a href={`${BASE_PATH}/app`}>
          <small>For the community</small>
          <h3>Jay Connect</h3>
          <p>Wellness resources, Jay&apos;s story and a guided way to ask for help, volunteer or partner.</p>
        </a>
        <a href={`${BASE_PATH}${site.membership.console}`}>
          <small>His backend</small>
          <h3>Edit the site</h3>
          <p>Sign in to change copy, add pictures, photos and videos, and run the operation.</p>
        </a>
        <a href={site.membership.layer}>
          <small>McCluster layer</small>
          <h3>Membership</h3>
          <p>{site.membership.plan} is active. Account, plan and studio console live here.</p>
        </a>
      </section>

      <section className="jj-cta">
        <p>Ready to connect?</p>
        <h2>
          {site.ctaTitle}
          <em> {site.ctaBody}</em>
        </h2>
        <a className="jj-solid" href={`${BASE_PATH}/app?tab=connect`}>Start here</a>
      </section>

      <footer className="jj-foot">
        <a className="jj-logo" href={`${BASE_PATH}/`}>
          <span>{site.mark}</span>
          <b>{site.name}</b>
        </a>
        <p>Community · Wellness · Connection</p>
        <span>
          {site.city} · © 2026
          {site.membership.active ? " · McCluster Sites" : ""}
        </span>
      </footer>
    </main>
  );
}

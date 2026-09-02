"use client";

import { useMemo, useState } from "react";
import { defaultSite, loadPublishedSite, publishSite, type MediaItem, type SiteContent } from "@/lib/site";

export default function SiteEditor() {
  const initial = useMemo(() => loadPublishedSite(), []);
  const [site, setSite] = useState<SiteContent>(initial);
  const [photoUrl, setPhotoUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [saved, setSaved] = useState("");

  const set = <K extends keyof SiteContent>(key: K, value: SiteContent[K]) => {
    setSite((s) => ({ ...s, [key]: value }));
    setSaved("");
  };

  const addMedia = (kind: MediaItem["kind"], src: string) => {
    const url = src.trim();
    if (!url) return;
    if (kind === "image") {
      set("photos", [...site.photos, { kind: "image", src: url, alt: site.name }]);
      setPhotoUrl("");
    } else {
      set("videos", [...site.videos, { kind: "video", src: url, alt: site.name }]);
      setVideoUrl("");
    }
  };

  const save = () => {
    publishSite(site);
    setSaved("Published to this browser. Reload the homepage to see it. Download JSON if you want the studio to bake it into the next deploy.");
  };

  const download = () => {
    const blob = new Blob([JSON.stringify(site, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "jay-johnson-site.json";
    a.click();
  };

  return (
    <section className="pipeline-panel">
      <div className="panel-head">
        <div>
          <span>YOUR SITE</span>
          <h2>Edit pages, copy and media.</h2>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setSite(defaultSite)}>Reset</button>
          <button type="button" onClick={download}>Download JSON</button>
          <button type="button" onClick={save} style={{ background: "#3157d5", color: "#fff", border: 0, borderRadius: 10, padding: "12px 15px", fontWeight: 900 }}>
            Publish
          </button>
        </div>
      </div>
      <p style={{ fontSize: 12, lineHeight: 1.7, color: "#68738a" }}>
        This is Jay&apos;s own backend. Change what the public site says, then publish.
        Add picture, photo and video URLs the same way. Membership stays active on the McCluster layer.
      </p>
      {saved && <p style={{ background: "#e2f3eb", color: "#087452", borderRadius: 10, padding: 12, fontSize: 12 }}>{saved}</p>}
      <div className="site-editor">
        <label>Name<input value={site.name} onChange={(e) => set("name", e.target.value)} /></label>
        <label>City<input value={site.city} onChange={(e) => set("city", e.target.value)} /></label>
        <label>Kicker<input value={site.kicker} onChange={(e) => set("kicker", e.target.value)} /></label>
        <label>Headline<input value={site.headline} onChange={(e) => set("headline", e.target.value)} /></label>
        <label>Accent word<input value={site.headlineAccent} onChange={(e) => set("headlineAccent", e.target.value)} /></label>
        <label>Lede<textarea rows={3} value={site.lede} onChange={(e) => set("lede", e.target.value)} /></label>
        <label>About title<input value={site.aboutTitle} onChange={(e) => set("aboutTitle", e.target.value)} /></label>
        <label>About left<textarea rows={4} value={site.aboutLeft} onChange={(e) => set("aboutLeft", e.target.value)} /></label>
        <label>About right<textarea rows={4} value={site.aboutRight} onChange={(e) => set("aboutRight", e.target.value)} /></label>
        <label>Work title<input value={site.workTitle} onChange={(e) => set("workTitle", e.target.value)} /></label>
        {site.work.map((item, i) => (
          <label key={item.n}>
            Work {item.n}
            <input value={item.title} onChange={(e) => { const work = site.work.slice(); work[i] = { ...item, title: e.target.value }; set("work", work); }} />
            <textarea rows={2} value={item.text} onChange={(e) => { const work = site.work.slice(); work[i] = { ...item, text: e.target.value }; set("work", work); }} />
          </label>
        ))}
        <label>Portrait image URL<input value={site.portrait} onChange={(e) => set("portrait", e.target.value)} /></label>
        <label>Story image URL<input value={site.storyImage} onChange={(e) => set("storyImage", e.target.value)} /></label>
        <label>
          Add photo URL
          <span style={{ display: "flex", gap: 8 }}>
            <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://..." />
            <button type="button" onClick={() => addMedia("image", photoUrl)}>Add photo</button>
          </span>
        </label>
        <label>
          Add video URL
          <span style={{ display: "flex", gap: 8 }}>
            <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." />
            <button type="button" onClick={() => addMedia("video", videoUrl)}>Add video</button>
          </span>
        </label>
        <p style={{ fontSize: 12, color: "#68738a" }}>{site.photos.length} photos · {site.videos.length} videos on the public site.</p>
      </div>
    </section>
  );
}

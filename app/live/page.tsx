import { Radio, Camera, Share2 } from "lucide-react";

export default function LivePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Radio className="text-accent" />
          Live & Broadcast
        </h1>
        <p className="mt-2 text-muted">
          Go live from the website. Broadcast to socials without jumping between apps.
          Meta glasses feed in clean.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="aspect-video bg-background flex flex-col items-center justify-center gap-4">
          <Camera size={48} className="text-muted" />
          <p className="text-muted text-sm">Camera / Meta glasses feed will appear here</p>
          <button className="rounded-full bg-red-600 hover:bg-red-500 text-white px-6 py-2.5 font-medium flex items-center gap-2 transition">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            Go Live
          </button>
        </div>

        <div className="p-5 border-t border-border">
          <div className="flex items-center gap-3 text-sm text-muted">
            <Share2 size={16} />
            <span>Will push to Facebook, Instagram, YouTube, TikTok (once connected)</span>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="font-medium mb-1">Meta Glasses</h3>
          <p className="text-sm text-muted">
            Once you have the glasses, this page becomes the clean launch point for street content.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="font-medium mb-1">Cross-post</h3>
          <p className="text-sm text-muted">
            One button. Multiple platforms. Manage presence from the machine instead of the apps.
          </p>
        </div>
      </div>
    </div>
  );
}

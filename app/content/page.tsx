import { Video, Play, Eye } from "lucide-react";

const placeholderContent = [
  {
    id: 1,
    title: "First street conversation – \"What's your story?\"",
    description: "Meta glasses test. Genuine interaction, no script.",
    status: "Coming after glasses arrive",
    views: "—",
  },
  {
    id: 2,
    title: "Ride-along kindness series (ep 1–5)",
    description: "Operator wears glasses, James approaches people on the street.",
    status: "Planned",
    views: "—",
  },
  {
    id: 3,
    title: "Homeless to health check-in",
    description: "Welgen mobile wellness meets street outreach.",
    status: "Concept",
    views: "—",
  },
];

export default function ContentPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Video className="text-accent" />
          Kindness Content
        </h1>
        <p className="mt-2 text-muted max-w-2xl">
          Real conversations. On camera. No payment required for the interaction.
          This is the content that makes people feel something and want to support.
          Meta glasses make it natural.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {placeholderContent.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-border bg-surface overflow-hidden group"
          >
            <div className="aspect-video bg-background flex items-center justify-center relative">
              <Play className="text-muted group-hover:text-accent transition" size={40} />
              <div className="absolute bottom-2 left-2 text-xs bg-black/70 px-2 py-1 rounded">
                {item.status}
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-medium leading-snug">{item.title}</h3>
              <p className="text-sm text-muted mt-1">{item.description}</p>
              <div className="mt-3 flex items-center gap-1 text-xs text-muted">
                <Eye size={12} />
                {item.views} views
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-muted text-sm">
          Upload or embed first Meta glasses footage here.  
          This library becomes the proof that the model works.
        </p>
      </div>
    </div>
  );
}

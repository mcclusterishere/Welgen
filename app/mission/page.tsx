import { Heart, MapPin, Stethoscope, Home } from "lucide-react";

export default function MissionPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Heart className="text-accent" />
          The Mission
        </h1>
        <p className="mt-3 text-lg text-muted leading-relaxed">
          Get people off the street. Be genuine on camera. Build real partnerships with nonprofits.
          Use Welgen wellness as the practical hand that helps.
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-surface p-6 flex gap-4">
          <MapPin className="text-accent shrink-0 mt-1" size={24} />
          <div>
            <h2 className="font-semibold">On the Ground</h2>
            <p className="text-sm text-muted mt-1">
              Real conversations. Real people. Meta glasses capture it without making the moment awkward.
              The content is the proof.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 flex gap-4">
          <Stethoscope className="text-accent shrink-0 mt-1" size={24} />
          <div>
            <h2 className="font-semibold">Welgen Wellness</h2>
            <p className="text-sm text-muted mt-1">
              Mobile wellness, WellScreen, check-ups. Practical help that meets people where they are.
              FormDr intake is ready.
            </p>
            <a
              href="https://app.formdr.com/practice/NDA4MjA=/form/4SwPxMEauV-yK4wEmZP39IJPxbZ0H4wk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-sm text-accent hover:underline"
            >
              Open patient form →
            </a>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 flex gap-4">
          <Home className="text-accent shrink-0 mt-1" size={24} />
          <div>
            <h2 className="font-semibold">Housing Ambition</h2>
            <p className="text-sm text-muted mt-1">
              Foreclosed housing acquisition + non-profit structure on the backend.
              The long game is actual roofs over heads.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-12 rounded-xl border border-border bg-surface/50 p-6 text-center text-sm text-muted">
        <p>
          4166 Snapfinger Drive / Snapfinger Woods Drive  
          Decatur, Georgia 30035
        </p>
        <p className="mt-2">This website is the control panel for the whole machine.</p>
      </div>
    </div>
  );
}

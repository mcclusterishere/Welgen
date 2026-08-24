import { Handshake, Check, DollarSign } from "lucide-react";

const tiers = [
  {
    name: "Street Ambassador",
    price: "$497",
    period: "/ month",
    description: "James becomes the visible face of your nonprofit on the street.",
    features: [
      "Tagged in kindness content & lives",
      "Monthly outreach report",
      "Shoutouts in videos",
      "Priority introduction to people helped",
    ],
  },
  {
    name: "Impact Partner",
    price: "$1,497",
    period: "/ month",
    description: "Deeper integration + dedicated content series for your mission.",
    features: [
      "Everything in Street Ambassador",
      "Dedicated content series (3–5 pieces)",
      "Live stream features",
      "Direct coordination on specific populations",
      "Website feature placement",
    ],
    highlighted: true,
  },
  {
    name: "Mission Ally",
    price: "Custom",
    period: "",
    description: "Full custom partnership for larger organizations.",
    features: [
      "Everything above",
      "Custom volume of content",
      "On-site activations",
      "Co-branded campaigns",
      "Direct access",
    ],
  },
];

export default function AmbassadorPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight flex items-center justify-center gap-3">
          <Handshake className="text-accent" />
          Nonprofit Ambassador
        </h1>
        <p className="mt-3 text-muted max-w-xl mx-auto">
          Being the authentic face of your mission on the street is not free.
          Nonprofits who want that energy pay for the partnership.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`rounded-2xl border p-6 flex flex-col ${
              tier.highlighted
                ? "border-accent bg-accent/5"
                : "border-border bg-surface"
            }`}
          >
            <div className="mb-4">
              <h2 className="text-lg font-semibold">{tier.name}</h2>
              <p className="text-sm text-muted mt-1">{tier.description}</p>
            </div>

            <div className="mb-6">
              <span className="text-3xl font-bold">{tier.price}</span>
              <span className="text-muted text-sm">{tier.period}</span>
            </div>

            <ul className="space-y-2 mb-8 flex-1">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check size={16} className="text-accent shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <button
              className={`w-full rounded-xl py-3 font-medium transition ${
                tier.highlighted
                  ? "bg-accent text-black hover:bg-accent-dim"
                  : "border border-border hover:border-accent/50"
              }`}
            >
              {tier.price === "Custom" ? "Talk to us" : "Get Started"}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-xl border border-border bg-surface p-6 text-center">
        <DollarSign className="mx-auto text-accent mb-3" size={28} />
        <p className="text-sm text-muted max-w-md mx-auto">
          Payments will route through Stripe / your preferred processor.
          This is the paid layer that turns street work into sustainable partnerships.
        </p>
      </div>
    </div>
  );
}

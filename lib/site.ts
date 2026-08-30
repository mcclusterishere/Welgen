export type WorkItem = { n: string; title: string; text: string };
export type MediaItem = { kind: "image" | "video"; src: string; alt: string };

export type SiteContent = {
  name: string;
  mark: string;
  city: string;
  kicker: string;
  headline: string;
  headlineAccent: string;
  lede: string;
  aboutTitle: string;
  aboutLeft: string;
  aboutRight: string;
  workTitle: string;
  work: WorkItem[];
  nextTitle: string;
  nextBody: string;
  nextItems: string[];
  ctaTitle: string;
  ctaBody: string;
  portrait: string;
  storyImage: string;
  videos: MediaItem[];
  photos: MediaItem[];
  membership: {
    active: boolean;
    plan: string;
    layer: string;
    console: string;
  };
};

export const SITE_STORAGE_KEY = "welgen.site.published";

export const defaultSite: SiteContent = {
  name: "Jay Johnson",
  mark: "JJ",
  city: "Atlanta",
  kicker: "Chicago roots · Atlanta work",
  headline: "Jay",
  headlineAccent: "Johnson",
  lede: "A community connector building pathways between people who need support and the institutions, programs and partners equipped to provide it.",
  aboutTitle: "Raised by a big family. Driven by a bigger purpose.",
  aboutLeft:
    "Jay is from Chicago and grew up as one of ten children—six boys and four girls. In a household that large, listening, adapting and showing up for others were part of everyday life.",
  aboutRight:
    "He moved to Atlanta in 2023 with an interest in helping the general population at large. Today he is building a network that can connect people with health resources, court partners, community programs and new economic opportunities.",
  workTitle: "Relationships that move resources.",
  work: [
    { n: "01", title: "Community support", text: "Connecting people with organizations, services and individuals positioned to help." },
    { n: "02", title: "Wellness access", text: "Representing Welgen One programs and helping communities find the proper patient-intake path." },
    { n: "03", title: "Partner development", text: "Building relationships across courts, corporations, community organizations and wholesale real estate." },
  ],
  nextTitle: "A nonprofit built to help directly.",
  nextBody:
    "Jay aspires to form a nonprofit capable of giving direct assistance while coordinating the right outside partner for needs the organization cannot handle alone.",
  nextItems: [
    "Court and referral partnerships",
    "Corporate and wholesale real-estate relationships",
    "Community-program ambassadorships",
    "Direct public assistance",
  ],
  ctaTitle: "Bring the need. Bring the resource.",
  ctaBody: "Let's build the bridge.",
  portrait: "/welgen-leadership.jpeg",
  storyImage: "/community-leadership.jpeg",
  videos: [],
  photos: [],
  membership: {
    active: true,
    plan: "McCluster Sites · Web",
    layer: "https://matthew.mccluster.org/account.html",
    console: "/admin",
  },
};

export function loadPublishedSite(): SiteContent {
  if (typeof window === "undefined") return defaultSite;
  try {
    const raw = window.localStorage.getItem(SITE_STORAGE_KEY);
    if (!raw) return defaultSite;
    return { ...defaultSite, ...JSON.parse(raw) };
  } catch {
    return defaultSite;
  }
}

export function publishSite(content: SiteContent) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SITE_STORAGE_KEY, JSON.stringify(content));
}

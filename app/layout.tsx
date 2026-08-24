import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL("https://welgen-one-modern.mccluster.chatgpt.site"),
  title: "Welgen One | Mobile Wellness, Personalized",
  description: "Preventive screenings, wellness insights and connected care delivered to communities, workplaces and partner organizations.",
  openGraph: {
    title: "Welgen One",
    description: "Better health should meet you where you are.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Welgen One — Better health should meet you where you are." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Welgen One",
    description: "Better health should meet you where you are.",
    images: ["/og.png"],
  },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

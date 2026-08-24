import type { Metadata } from "next";
import "./globals.css";\nimport { Navbar } from "@/components/Navbar";
export const metadata: Metadata = {
  metadataBase: new URL("https://welgen-one-modern.mccluster.chatgpt.site"),
  title: "Jay Johnson | Community. Content. Opportunity.",
  description: "Jay Johnson connects communities, nonprofits, wellness resources and brands through authentic representation and content.",
  openGraph: { title: "Jay Johnson", description: "Community. Content. Opportunity.", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Jay Johnson — Community. Content. Opportunity." }] },
  twitter: { card: "summary_large_image", title: "Jay Johnson", description: "Community. Content. Opportunity.", images: ["/og.png"] },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><Navbar />{children}</body></html>; }

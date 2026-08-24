import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://welgen-one-modern.mccluster.chatgpt.site"),
  title: "Jay Johnson | Community Connection",
  description: "Meet Jay, explore wellness resources and connect for help, partnership or community impact.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Jay Connect" },
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
  openGraph: { title: "Jay Johnson", description: "Community. Wellness. Connection.", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Jay Johnson community connection app" }] },
  twitter: { card: "summary_large_image", title: "Jay Johnson", description: "Community. Wellness. Connection.", images: ["/og.png"] },
};

export const viewport: Viewport = {
  themeColor: "#0b1629",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

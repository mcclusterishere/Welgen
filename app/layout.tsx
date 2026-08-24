import type { Metadata, Viewport } from "next";
import "./globals.css";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? `https://mcclusterishere.github.io${BASE_PATH}`;
const SOCIAL_IMAGE = `${SITE_URL.replace(/\/$/, "")}/og.png`;

export const metadata: Metadata = {
  metadataBase: new URL(`${SITE_URL}/`),
  title: "Jay Johnson | Community Connection",
  description: "Meet Jay, explore wellness resources and connect for help, partnership or community impact.",
  manifest: `${BASE_PATH}/manifest.webmanifest`,
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Jay Connect" },
  icons: { icon: `${BASE_PATH}/icon-192.png`, apple: `${BASE_PATH}/icon-192.png` },
  openGraph: { title: "Jay Johnson", description: "Community. Wellness. Connection.", images: [{ url: SOCIAL_IMAGE, width: 1200, height: 630, alt: "Jay Johnson community connection app" }] },
  twitter: { card: "summary_large_image", title: "Jay Johnson", description: "Community. Wellness. Connection.", images: [SOCIAL_IMAGE] },
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

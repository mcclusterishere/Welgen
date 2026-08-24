import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Jay Johnson | Client Dashboard",
  description: "Professional overview of Jay Johnson's community platform.",
  robots: { index: false, follow: false },
};
export default function DashboardLayout({ children }: { children: React.ReactNode }) { return children; }

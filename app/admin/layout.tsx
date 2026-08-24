import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Operations | Jay Johnson",
  description: "Operator console.",
  // Not a secret — the console is behind a login — but there is no reason
  // for an internal tool to be in anyone's search results.
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}

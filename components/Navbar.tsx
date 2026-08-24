"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/content", label: "Content" },
  { href: "/outreach", label: "Outreach" },
  { href: "/ambassador", label: "Partnerships" },
  { href: "/live", label: "Live" },
  { href: "/mission", label: "Mission" },
];

export function Navbar() {
  const pathname = usePathname();
  return (
    <header className="site-nav">
      <Link className="jay-logo" href="/" aria-label="Jay Johnson home"><span>JJ</span><b>JAY JOHNSON</b></Link>
      <nav aria-label="Primary navigation">
        {links.map((link) => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined}>{link.label}</Link>)}
      </nav>
      <Link className="nav-cta" href="/ambassador">Work with Jay <span>↗</span></Link>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Command, Video, Mail, Handshake, Radio, Heart } from "lucide-react";

const links = [
  { href: "/", label: "Command", icon: Command },
  { href: "/content", label: "Content", icon: Video },
  { href: "/outreach", label: "Outreach", icon: Mail },
  { href: "/ambassador", label: "Ambassador", icon: Handshake },
  { href: "/live", label: "Live", icon: Radio },
  { href: "/mission", label: "Mission", icon: Heart },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="text-accent text-xl">W</span>
          <span>Welgen</span>
          <span className="text-xs font-normal text-muted ml-1">Outreach Machine</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-accent/10 text-accent"
                    : "text-muted hover:text-white hover:bg-surface"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </div>

        {/* Mobile simple indicator */}
        <div className="md:hidden text-xs text-muted">Menu</div>
      </div>
    </nav>
  );
}

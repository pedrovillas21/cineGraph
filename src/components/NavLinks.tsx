"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Início", match: (p: string) => p === "/" || p.startsWith("/perfil") || p.startsWith("/filme") },
  { href: "/como-funciona", label: "Como funciona", match: (p: string) => p.startsWith("/como-funciona") },
];

/** Links do topo, com a página atual destacada. */
export function NavLinks() {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-1 text-sm">
      {links.map((l) => {
        const active = l.match(pathname);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 transition-colors duration-300 ease-out-soft ${active ? "bg-surface-2 text-foreground" : "text-muted hover:bg-surface-2/60 hover:text-foreground"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}

import Link from "next/link";
import { NavLinks } from "./NavLinks";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2 font-semibold tracking-tight">
          <span
            aria-hidden
            className="grid h-7 w-7 place-items-center rounded-md bg-accent text-white transition-transform duration-500 ease-spring group-hover:rotate-[-8deg] group-hover:scale-110"
          >
            <svg width="11" height="11" viewBox="0 0 12 12">
              <path d="M3 1.5v9l7.5-4.5z" fill="currentColor" />
            </svg>
          </span>
          CineGraph
        </Link>
        <NavLinks />
      </nav>
    </header>
  );
}

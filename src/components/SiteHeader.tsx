import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span aria-hidden className="grid h-7 w-7 place-items-center rounded-md bg-accent text-sm text-white">
            ▶
          </span>
          CineGraph
        </Link>
        <div className="flex items-center gap-1 text-sm">
          <Link href="/" className="rounded-md px-3 py-1.5 text-muted hover:bg-surface-2 hover:text-foreground">
            Início
          </Link>
          <Link
            href="/como-funciona"
            className="rounded-md px-3 py-1.5 text-muted hover:bg-surface-2 hover:text-foreground"
          >
            Como funciona
          </Link>
        </div>
      </nav>
    </header>
  );
}

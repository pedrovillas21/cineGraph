/**
 * Esqueletos mostrados na hora em que se clica num link (arquivos loading.tsx),
 * enquanto o servidor monta a página. Têm o mesmo desenho das telas reais para
 * nada "pular" quando o conteúdo chega.
 */

function Block({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-surface-2 ${className}`} />;
}

export function SkeletonHeading() {
  return (
    <div className="mb-4 space-y-2 sm:mb-6">
      <Block className="h-6 w-56 sm:h-8 sm:w-72" />
      <Block className="h-4 w-72 max-w-full sm:w-96" />
    </div>
  );
}

/** Mesma grade de MovieGrid: fileira no celular, 4–6 colunas a partir de `sm`. */
export function SkeletonMovieGrid({ count = 12 }: { count?: number }) {
  return (
    <div className="-mx-4 flex gap-3 overflow-hidden px-4 pt-1 *:w-[40%] *:shrink-0 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-x-4 sm:gap-y-6 sm:p-0 sm:*:w-auto lg:grid-cols-6">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={i >= 6 ? "hidden sm:block" : ""}>
          <Block className="aspect-[2/3] w-full" />
          <Block className="mt-2.5 h-4 w-4/5" />
          <Block className="mt-1.5 h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="-mx-4 flex gap-3 overflow-hidden px-4 pt-1 *:w-[80%] *:shrink-0 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:p-0 sm:*:w-auto lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <Block className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Block className="h-4 w-1/2" />
              <Block className="h-3 w-3/4" />
            </div>
          </div>
          <Block className="mt-4 h-20 w-32" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonSection({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto mt-10 max-w-6xl px-4 sm:mt-16 sm:px-6">
      <SkeletonHeading />
      {children}
    </section>
  );
}

/** Faixa escura do topo (início e filme), com o texto em blocos claros. */
export function SkeletonDarkHero({ poster = false }: { poster?: boolean }) {
  return (
    <section aria-busy className="bg-neutral-950">
      <div className="mx-auto flex max-w-6xl items-start gap-6 px-4 py-12 sm:gap-8 sm:px-6 sm:py-24">
        {poster && <div className="aspect-[2/3] w-28 shrink-0 animate-pulse rounded-lg bg-white/10 sm:w-56" />}
        <div className="w-full max-w-2xl space-y-4">
          <div className="h-4 w-28 animate-pulse rounded bg-white/10" />
          <div className="h-9 w-4/5 animate-pulse rounded-lg bg-white/10 sm:h-14" />
          <div className="h-9 w-3/5 animate-pulse rounded-lg bg-white/10 sm:h-14" />
          <div className="h-4 w-full max-w-md animate-pulse rounded bg-white/10" />
        </div>
      </div>
    </section>
  );
}

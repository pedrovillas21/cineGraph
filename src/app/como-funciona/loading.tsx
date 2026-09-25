import { SkeletonSection } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main aria-busy>
      <section className="mx-auto max-w-6xl space-y-3 px-4 pt-8 sm:px-6 sm:pt-12">
        <div className="h-4 w-28 animate-pulse rounded bg-surface-2" />
        <div className="h-9 w-3/4 animate-pulse rounded-lg bg-surface-2 sm:h-12" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded bg-surface-2" />
        <div className="grid gap-3 pt-6 md:grid-cols-3 md:gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-2 sm:h-40" />
          ))}
        </div>
      </section>
      <SkeletonSection>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-2" />
          ))}
        </div>
      </SkeletonSection>
    </main>
  );
}

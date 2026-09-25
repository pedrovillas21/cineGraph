import { SkeletonCards, SkeletonMovieGrid, SkeletonSection } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main aria-busy>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-6 sm:gap-5 sm:px-6 sm:py-8">
          <div className="h-[72px] w-[72px] animate-pulse rounded-full bg-surface-2" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-10 animate-pulse rounded bg-surface-2" />
            <div className="h-8 w-40 animate-pulse rounded-lg bg-surface-2" />
            <div className="h-4 w-64 max-w-full animate-pulse rounded bg-surface-2" />
          </div>
        </div>
      </section>
      <SkeletonSection>
        <SkeletonMovieGrid />
      </SkeletonSection>
      <SkeletonSection>
        <SkeletonCards />
      </SkeletonSection>
    </main>
  );
}

import { SkeletonCards, SkeletonDarkHero, SkeletonMovieGrid, SkeletonSection } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main>
      <SkeletonDarkHero />
      <SkeletonSection>
        <SkeletonCards />
      </SkeletonSection>
      <SkeletonSection>
        <SkeletonMovieGrid />
      </SkeletonSection>
    </main>
  );
}

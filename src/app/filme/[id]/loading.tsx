import { SkeletonDarkHero, SkeletonMovieGrid, SkeletonSection } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main>
      <SkeletonDarkHero poster />
      <SkeletonSection>
        <SkeletonMovieGrid count={6} />
      </SkeletonSection>
    </main>
  );
}

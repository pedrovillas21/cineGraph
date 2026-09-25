import { Reveal } from "./motion";

export function Section({
  title,
  subtitle,
  children,
  id,
}: {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="mx-auto mt-10 max-w-6xl scroll-mt-20 px-4 sm:mt-16 sm:px-6">
      <Reveal className="mb-4 sm:mb-6">
        <h2 className="text-xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted sm:mt-1.5 sm:text-base">{subtitle}</p>}
      </Reveal>
      {children}
    </section>
  );
}

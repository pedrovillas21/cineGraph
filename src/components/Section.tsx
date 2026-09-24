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
    <section id={id} className="mx-auto mt-8 max-w-6xl scroll-mt-20 px-4 sm:mt-12 sm:px-6">
      <div className="mb-4 sm:mb-5">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

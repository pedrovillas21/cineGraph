export function StatCard({ label, value, dot }: { label: string; value: string; dot?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3 sm:p-4">
      <p className="flex items-center gap-2 text-xs text-muted sm:text-sm">
        {dot && <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />}
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums sm:text-2xl">{value}</p>
    </div>
  );
}

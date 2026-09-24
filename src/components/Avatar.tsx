export function Avatar({
  initials,
  hue,
  size = 48,
}: {
  initials: string;
  hue: number;
  size?: number;
}) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: `linear-gradient(135deg, hsl(${hue} 60% 48%), hsl(${(hue + 40) % 360} 65% 36%))`,
      }}
    >
      {initials}
    </span>
  );
}

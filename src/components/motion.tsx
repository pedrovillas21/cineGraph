import { Children } from "react";
import { InViewReveal, InViewStagger } from "./motion-client";

export { CountUp } from "./motion-client";

/**
 * Sistema de movimento do CineGraph (ver o canvas "CineGraph em movimento"):
 * - tudo entra de baixo, em cascata de 60 ms;
 * - o que é clicável responde com mola (curva `ease-spring` do globals.css);
 * - com "reduzir movimento" ligado no sistema, nada se mexe sozinho.
 *
 * Desempenho: as animações são CSS (rodam na GPU e começam assim que o HTML
 * chega, sem esperar o JavaScript). Só o disparo "ao rolar até aqui" e a
 * contagem de números usam JS (motion-client.tsx). Nada aqui usa `filter` ou
 * `backdrop-filter`, que custam caro no celular.
 */

const delayStyle = (s: number) => (s ? { animationDelay: `${s}s` } : undefined);

/**
 * Entra de baixo. `onMount` anima ao carregar (topo da página); sem ele,
 * anima quando o elemento aparece na tela.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  onMount = false,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  onMount?: boolean;
}) {
  if (!onMount) return <InViewReveal className={className}>{children}</InViewReveal>;
  return (
    <div className={`animate-rise ${className}`} style={delayStyle(delay)}>
      {children}
    </div>
  );
}

const itemTags = { div: "div", ul: "li", ol: "li" } as const;

/**
 * Lista em cascata: cada filho direto é embrulhado num item (`li` quando `as`
 * é "ul"/"ol"), então as classes que miram os filhos diretos (`*:w-[40%]`,
 * `*:snap-start`) continuam valendo.
 */
export function Stagger({
  children,
  className = "",
  as = "div",
  delay = 0,
  onMount = false,
}: {
  children: React.ReactNode;
  className?: string;
  as?: keyof typeof itemTags;
  delay?: number;
  onMount?: boolean;
}) {
  if (!onMount)
    return (
      <InViewStagger as={as} className={className}>
        {children}
      </InViewStagger>
    );
  const Tag = as;
  const Item = itemTags[as];
  return (
    <Tag className={className}>
      {Children.toArray(children).map((child, i) => (
        <Item key={i} className="min-w-0 animate-rise" style={delayStyle(delay + i * 0.06)}>
          {child}
        </Item>
      ))}
    </Tag>
  );
}

/** Título que sobe palavra por palavra, cada uma saindo de trás de uma máscara. */
export function WordReveal({
  text,
  accent,
  className,
  accentClassName = "",
  delay = 0.1,
}: {
  text: string;
  /** Palavras finais destacadas (ex.: "vai amar."). */
  accent?: string;
  className?: string;
  accentClassName?: string;
  delay?: number;
}) {
  const words = [
    ...text.split(" ").map((w) => ({ w, accent: false })),
    ...(accent ? accent.split(" ").map((w) => ({ w, accent: true })) : []),
  ].filter((x) => x.w);
  return (
    <h1 className={className} aria-label={[text, accent].filter(Boolean).join(" ")}>
      {words.map(({ w, accent }, i) => (
        <span key={i}>
          <span aria-hidden className="-mb-[0.12em] inline-block overflow-hidden pb-[0.12em] align-top">
            <span
              className={`inline-block animate-word-up ${accent ? accentClassName : ""}`}
              style={delayStyle(delay + i * 0.055)}
            >
              {w}
            </span>
          </span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </h1>
  );
}

/** Surge com mola (selos, avatares, etiquetas). */
export function Pop({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <span className={`animate-pop ${className}`} style={delayStyle(delay)}>
      {children}
    </span>
  );
}

/** Barra que enche da esquerda até `percent`. */
export function GrowBar({ percent, className = "", delay }: { percent: number; className?: string; delay?: number }) {
  return (
    <div
      className={`origin-left animate-grow ${className}`}
      style={{
        width: `${Math.max(0, Math.min(100, percent))}%`,
        ...(delay !== undefined ? { animationDelay: `${delay}s` } : {}),
      }}
    />
  );
}

/** Grafo do destaque: você → filmes em comum → pessoa parecida → indicação. */
export function GraphDemo({ common, pick }: { common: [string, string]; pick: string }) {
  const short = (t: string) => (t.length > 14 ? `${t.slice(0, 13)}…` : t);
  const edge = (d: string, delay: number, stroke = "rgba(244,241,234,0.4)", width = 1.5) => (
    <path
      d={d}
      pathLength={1}
      className="graph-edge"
      style={delayStyle(delay)}
      fill="none"
      stroke={stroke}
      strokeWidth={width}
    />
  );
  const node = (delay: number, children: React.ReactNode) => (
    <g className="graph-node" style={delayStyle(delay)}>
      {children}
    </g>
  );
  const movie = (x: number, y: number, label: string, fill = "#ec6b4f") => (
    <>
      <rect x={x - 56} y={y - 17} width={112} height={34} rx={8} fill={fill} />
      <text x={x} y={y + 5} textAnchor="middle" fontSize={12} fontWeight={600} fill="#1b1a18">
        {short(label)}
      </text>
    </>
  );
  const person = (x: number, y: number, initial: string, label: string) => (
    <>
      <circle cx={x} cy={y} r={24} fill="#6fa8d6" />
      <text x={x} y={y + 6} textAnchor="middle" fontSize={16} fontWeight={600} fill="#0f0e0d">
        {initial}
      </text>
      <text x={x} y={y + 46} textAnchor="middle" fontSize={12} fill="#c9c3b8">
        {label}
      </text>
    </>
  );

  return (
    <svg
      viewBox="0 0 460 290"
      className="h-auto w-full"
      role="img"
      aria-label="Você e uma pessoa parecida gostaram dos mesmos filmes; o que ela amou vira sua indicação"
    >
      {edge("M62 150 L180 70", 0.7)}
      {edge("M62 150 L180 230", 0.82)}
      {edge("M180 70 L300 150", 1.15)}
      {edge("M180 230 L300 150", 1.27)}
      {edge("M300 150 L378 150", 1.65, "#f7a47f", 2)}
      {edge("M62 126 C 130 10, 340 10, 396 128", 1.9, "#6ee7b7", 1.5)}
      {node(0.45, person(62, 150, "V", "Você"))}
      {node(0.76, movie(180, 70, common[0]))}
      {node(0.88, movie(180, 230, common[1]))}
      {node(1.32, person(300, 150, "P", "Alguém parecido"))}
      {node(1.8, movie(400, 150, pick, "#f7a47f"))}
    </svg>
  );
}

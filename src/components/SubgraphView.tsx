"use client";

import Link from "next/link";
import { useState } from "react";
import type { Subgraph, SubgraphNode, SubgraphRole } from "@/server/graph/subgraph";

/**
 * Desenho do subgrafo real de um perfil (checkpoint 5): quatro colunas, uma por
 * salto do algoritmo. Só desenha; o recorte vem pronto de recommendationSubgraph().
 */

const W = 980;
const ROW = 58;
const PAD = 44;
const COLUMNS: Record<SubgraphRole, { x: number; title: string }> = {
  origin: { x: 70, title: "Você" },
  bridge: { x: 330, title: "Filmes em comum" },
  neighbor: { x: 560, title: "Gosto parecido" },
  recommendation: { x: 760, title: "Recomendados" },
};
const ORDER: SubgraphRole[] = ["origin", "bridge", "neighbor", "recommendation"];

const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const isUser = (n: SubgraphNode) => n.key.startsWith("u:");

export function SubgraphView({ data, profileId }: { data: Subgraph; profileId: number }) {
  const [active, setActive] = useState<string | null>(null);

  const rows = Math.max(...ORDER.map((r) => data.nodes.filter((n) => n.role === r).length));
  const H = PAD * 2 + Math.max(rows - 1, 1) * ROW;
  const pos = new Map<string, { x: number; y: number }>();
  for (const role of ORDER) {
    const col = data.nodes.filter((n) => n.role === role);
    const gap = col.length > 1 ? (H - PAD * 2) / (col.length - 1) : 0;
    col.forEach((n, i) => pos.set(n.key, { x: COLUMNS[role].x, y: col.length > 1 ? PAD + i * gap : H / 2 }));
  }
  const touches = (e: { user: string; movie: string }) => active === e.user || active === e.movie;
  const lit = new Set(data.edges.filter(touches).flatMap((e) => [e.user, e.movie]));

  return (
    <div className="rounded-xl border border-border bg-surface p-3 sm:p-5">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H + 24}`}
          className="h-auto w-full min-w-[720px]"
          role="img"
          aria-label="Subgrafo da recomendação: você, filmes em comum, pessoas com gosto parecido e filmes recomendados"
        >
          {ORDER.map((r) => (
            <text key={r} x={COLUMNS[r].x} y={14} textAnchor="middle" className="fill-muted text-[12px] font-medium">
              {COLUMNS[r].title}
            </text>
          ))}
          <g transform="translate(0 24)">
            {data.edges.map((e) => {
              const a = pos.get(e.user)!;
              const b = pos.get(e.movie)!;
              const on = active !== null && touches(e);
              const toRec = data.nodes.find((n) => n.key === e.movie)?.role === "recommendation";
              return (
                <g key={`${e.user}-${e.movie}`} opacity={active === null ? 0.55 : on ? 1 : 0.08}>
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={toRec ? "var(--movie)" : "var(--user)"}
                    strokeWidth={0.6 + e.rating * 0.7}
                    strokeLinecap="round"
                  >
                    <title>{`nota ${e.rating}`}</title>
                  </line>
                  {on && (
                    <text
                      x={(a.x + b.x) / 2}
                      y={(a.y + b.y) / 2 - 4}
                      textAnchor="middle"
                      className="fill-foreground text-[11px] font-semibold"
                      paintOrder="stroke"
                      stroke="var(--surface)"
                      strokeWidth={4}
                    >
                      {e.rating}★
                    </text>
                  )}
                </g>
              );
            })}

            {data.nodes.map((n) => {
              const p = pos.get(n.key)!;
              const user = isUser(n);
              const id = n.key.slice(2);
              const href = user ? `/perfil/${id}` : `/filme/${id}?perfil=${profileId}`;
              const right = n.role === "recommendation";
              const sub =
                n.role === "neighbor" ? `sim ${n.value!.toFixed(2)}` : right ? `${n.value!.toFixed(1)}★ previsto` : null;
              return (
                <g key={n.key} opacity={active === null || lit.has(n.key) || active === n.key ? 1 : 0.35}>
                <Link
                  href={href}
                  onMouseEnter={() => setActive(n.key)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(n.key)}
                  onBlur={() => setActive(null)}
                  aria-label={n.label}
                >
                  {user ? (
                    <circle cx={p.x} cy={p.y} r={n.role === "origin" ? 18 : 13} fill="var(--user)" />
                  ) : (
                    <rect x={p.x - 11} y={p.y - 11} width={22} height={22} rx={5} fill="var(--movie)" />
                  )}
                  <text
                    x={right ? p.x + 20 : p.x}
                    y={right ? p.y - 2 : p.y + (n.role === "origin" ? 34 : 27)}
                    textAnchor={right ? "start" : "middle"}
                    className="fill-foreground text-[12px]"
                  >
                    <title>{n.label}</title>
                    {cut(n.label, right ? 30 : 24)}
                  </text>
                  {sub && (
                    <text
                      x={right ? p.x + 20 : p.x}
                      y={right ? p.y + 13 : p.y + 40}
                      textAnchor={right ? "start" : "middle"}
                      className="fill-muted text-[11px]"
                    >
                      {sub}
                    </text>
                  )}
                </Link>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
        <span>
          <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-user align-middle" />
          pessoa (vértice-usuário)
        </span>
        <span>
          <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-movie align-middle" />
          filme (vértice-filme)
        </span>
        <span>aresta = avaliação; quanto mais grossa, maior a nota</span>
        <span>passe o mouse ou o foco num vértice para ver as notas</span>
        <span className="sm:hidden">no celular, arraste o desenho para o lado</span>
      </p>
    </div>
  );
}

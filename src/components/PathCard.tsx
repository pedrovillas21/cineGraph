"use client";

import { useState, type FormEvent } from "react";
import type { DashboardData, PathView } from "@/server/services/dashboardService";
import { fmt } from "./format";

type Props = Pick<DashboardData, "user" | "path">;

interface PathResponse {
  length: number | null;
  path: PathView["steps"];
  distances?: { byDistance: PathView["distances"]; unreachable: number };
  stats: { ms: number };
  error?: string;
}

/**
 * Caminho mínimo entre dois usuários. A primeira busca vem pronta do servidor;
 * as próximas chamam /api/graph/path e trocam só este card, sem recarregar a
 * página (e sem perder a posição de rolagem).
 */
export function PathCard({ user, path: initial }: Props) {
  const [view, setView] = useState({ from: user, path: initial });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { from, path } = view;
  const withCypher = initial.cypher !== null;

  async function search(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const a = Number(form.get("user"));
    const b = Number(form.get("ate"));
    setLoading(true);
    setError(null);
    try {
      const get = async (engine: string) => {
        const res = await fetch(`/api/graph/path?from=${a}&to=${b}&engine=${engine}`);
        const body = (await res.json()) as PathResponse;
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        return body;
      };
      // A versão Cypher é só comparação: se falhar, o card mostra o erro dela e segue
      const [mem, cy] = await Promise.all([
        get("memory"),
        withCypher ? get("cypher").catch((err: Error) => ({ error: err.message })) : null,
      ]);
      setView({
        from: { ...from, id: a, name: mem.path[0]?.label ?? `Usuário ${a}` },
        path: {
          to: { id: b, name: mem.path.at(-1)?.label ?? `Usuário ${b}` },
          length: mem.length,
          steps: mem.path,
          ms: mem.stats.ms,
          distances: mem.distances?.byDistance ?? [],
          unreachable: mem.distances?.unreachable ?? 0,
          cypher: !cy ? null : "stats" in cy ? { length: cy.length, ms: cy.stats.ms } : { error: cy.error ?? "erro" },
        },
      });
      // Mantém a URL compartilhável sem navegar
      const url = new URL(location.href);
      url.searchParams.set("user", String(a));
      url.searchParams.set("ate", String(b));
      history.replaceState(history.state, "", url);
    } catch (err) {
      setError(err instanceof Error && err.message === "usuário inexistente" ? `Usuário ${a} ou ${b} não existe.` : String((err as Error).message));
    } finally {
      setLoading(false);
    }
  }

  const total = path.distances.reduce((s, d) => s + d.users, 0);
  return (
    <section id="caminho" className="h-full min-w-0 scroll-mt-20 rounded-xl border border-border bg-surface p-5">
      <h2 className="font-semibold">Caminho mínimo entre dois usuários</h2>
      <p className="mb-4 text-sm text-muted">
        Busca em largura (BFS) no grafo bipartido: quanto menor o caminho, maior a afinidade. O comprimento é sempre
        par, porque <span className="text-user">usuário</span> e <span className="text-movie">filme</span> se alternam.
      </p>

      <form className="mb-4 flex flex-wrap items-end gap-2" onSubmit={search}>
        <label className="text-xs text-muted">
          De
          <input
            name="user"
            type="number"
            min={1}
            required
            defaultValue={user.id}
            className="mt-1 block w-24 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
          />
        </label>
        <label className="text-xs text-muted">
          Até
          <input
            name="ate"
            type="number"
            min={1}
            required
            defaultValue={initial.to.id}
            className="mt-1 block w-24 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
          />
        </label>
        <button
          disabled={loading}
          className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "Buscando…" : "Buscar caminho"}
        </button>
      </form>

      {initial.missingTo && path === initial && (
        <p className="mb-3 text-sm text-accent">
          Usuário {initial.missingTo} não existe; mostrando o mais distante de {from.name}.
        </p>
      )}
      {error && (
        <p className="mb-3 text-sm text-accent" role="alert">
          {error}
        </p>
      )}

      <div aria-live="polite" className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
        {path.length === null ? (
          <p className="text-sm">Não há caminho entre os dois usuários.</p>
        ) : (
          <>
            <p className="mb-3 text-sm">
              <strong>{from.name}</strong> → <strong>{path.to.name}</strong>: {path.length} aresta(s) em{" "}
              {path.ms.toFixed(2)} ms (memória).
            </p>
            <ol className="mb-3 flex flex-wrap items-center gap-x-1.5 gap-y-2 text-sm">
              {path.steps.map((s, i) => (
                <li key={`${s.kind}-${s.id}`} className="flex items-center gap-1.5">
                  {i > 0 && (
                    <span className="text-xs text-muted" title="peso da aresta (nota)">
                      —{s.rating}★→
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-0.5 ${s.kind === "user" ? "bg-user/15 text-user" : "bg-movie/15 text-movie"}`}
                  >
                    {s.label}
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}

        {path.cypher && (
          <p className="mb-3 break-words rounded-lg bg-background px-3 py-2 font-mono text-xs text-muted">
            {"error" in path.cypher
              ? `Cypher indisponível: ${path.cypher.error}`
              : `Cypher shortestPath((a)-[:RATED*..10]-(b)): ${path.cypher.length ?? "sem caminho"} aresta(s) em ${path.cypher.ms.toFixed(1)} ms`}
          </p>
        )}

        <p className="text-xs text-muted">
          De {from.name} até os outros {fmt.format(total)} usuários:{" "}
          {path.distances.map((d) => `${fmt.format(d.users)} a ${d.distance} arestas`).join(" · ")}
          {path.unreachable ? ` · ${path.unreachable} sem caminho` : ""}.
        </p>
      </div>
    </section>
  );
}

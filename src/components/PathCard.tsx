import type { DashboardData } from "@/server/services/dashboardService";
import { fmt } from "./format";

type Props = Pick<DashboardData, "user" | "path">;

export function PathCard({ user, path }: Props) {
  const total = path.distances.reduce((s, d) => s + d.users, 0);
  return (
    <section className="h-full min-w-0 rounded-xl border border-border bg-surface p-5">
      <h2 className="font-semibold">Caminho mínimo entre dois usuários</h2>
      <p className="mb-4 text-sm text-muted">
        Busca em largura (BFS) no grafo bipartido: quanto menor o caminho, maior a afinidade. O comprimento é sempre
        par, porque <span className="text-user">usuário</span> e <span className="text-movie">filme</span> se alternam.
      </p>

      <form className="mb-4 flex flex-wrap items-end gap-2" action="/como-funciona">
        <label className="text-xs text-muted">
          De
          <input
            name="user"
            type="number"
            min={1}
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
            defaultValue={path.to.id}
            className="mt-1 block w-24 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
          />
        </label>
        <button className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white">Buscar caminho</button>
      </form>

      {path.missingTo && (
        <p className="mb-3 text-sm text-accent">
          Usuário {path.missingTo} não existe; mostrando o mais distante de {user.name}.
        </p>
      )}

      {path.length === null ? (
        <p className="text-sm">Não há caminho entre os dois usuários.</p>
      ) : (
        <>
          <p className="mb-3 text-sm">
            <strong>{user.name}</strong> → <strong>{path.to.name}</strong>: {path.length} aresta(s) em{" "}
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
        De {user.name} até os outros {fmt.format(total)} usuários:{" "}
        {path.distances.map((d) => `${fmt.format(d.users)} a ${d.distance} arestas`).join(" · ")}
        {path.unreachable ? ` · ${path.unreachable} sem caminho` : ""}.
      </p>
    </section>
  );
}

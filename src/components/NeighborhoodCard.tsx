import type { DashboardData } from "@/server/services/dashboardService";
import { fmt } from "./format";

type Props = Pick<DashboardData, "user" | "missingUser" | "neighborhood" | "cypher">;

export function NeighborhoodCard({ user, missingUser, neighborhood, cypher }: Props) {
  return (
    <section className="min-w-0 rounded-xl border border-border bg-surface p-5">
      <h2 className="font-semibold">Vizinhança de 2 saltos</h2>
      <p className="mb-4 text-sm text-muted">
        <span className="text-user">usuário</span> → <span className="text-movie">filme</span> →{" "}
        <span className="text-user">outros usuários</span> que avaliaram o mesmo filme.
      </p>

      <form className="mb-4 flex gap-2" action="/como-funciona">
        <label htmlFor="user" className="sr-only">
          ID do usuário
        </label>
        <input
          id="user"
          name="user"
          type="number"
          min={1}
          defaultValue={user.id}
          className="w-28 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
        />
        <button className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white">Percorrer</button>
      </form>

      {missingUser && (
        <p className="mb-3 text-sm text-accent">
          Usuário {missingUser} não existe; mostrando {user.id}.
        </p>
      )}

      <p className="mb-3 text-sm">
        <strong>{user.name}</strong> avaliou {user.degree} filme(s) e alcança{" "}
        <strong>{fmt.format(neighborhood.reached)}</strong> usuário(s) em {neighborhood.ms.toFixed(2)} ms (memória).
      </p>

      {cypher && (
        <p className="mb-3 break-words rounded-lg bg-background px-3 py-2 font-mono text-xs text-muted">
          {"error" in cypher
            ? `Cypher indisponível: ${cypher.error}`
            : `Cypher (u)-[:RATED]->(m)<-[:RATED]-(v): ${fmt.format(cypher.reached)} usuários em ${cypher.ms.toFixed(1)} ms`}
        </p>
      )}

      <ul className="divide-y divide-border text-sm">
        {neighborhood.top.map((n) => (
          <li key={n.userId} className="py-2">
            <div className="flex justify-between">
              <span className="text-user">{n.name}</span>
              <span className="tabular-nums text-muted">{n.common} em comum</span>
            </div>
            <p className="truncate text-xs text-muted">
              via {n.viaTitles.join(", ")}
              {n.common > n.viaTitles.length ? "…" : ""}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

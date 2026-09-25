// Dados das páginas com cache (Data Cache do Next.js).
//
// O catálogo só muda quando o ETL roda de novo, então o resultado de cada tela
// pode ser reaproveitado entre visitas e entre instâncias do servidor. Com o
// cache quente a página nem carrega o grafo: evita os ~3,5 s de carga do
// Neo4j num servidor "frio" e a consulta de ~0,5 s da página de filme.
//
// Nunca guardamos a resposta de emergência (grafo de exemplo quando o banco
// falhou): ela é devolvida, mas a próxima visita tenta o banco de novo.

import { unstable_cache } from "next/cache";
import { getHome, getMovie, getProfile } from "./catalogService";

/** Troque ao mudar o formato dos dados das telas, para descartar o cache antigo. */
const VERSION = "v2";
/** Após rodar o ETL, as telas se atualizam em até 1 hora. */
const REVALIDATE = 3600;

/** Carrega a resposta de emergência para fora do cache sem precisar calculá-la de novo. */
class FallbackResponse extends Error {
  constructor(readonly data: unknown) {
    super("cinegraph:fallback");
  }
}

function cachedPage<A extends unknown[], R extends { dbError?: string } | null>(
  key: string,
  load: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  const cached = unstable_cache(
    async (...args: A) => {
      const data = await load(...args);
      if (data?.dbError) throw new FallbackResponse(data);
      return data;
    },
    [key, VERSION],
    { revalidate: REVALIDATE, tags: ["catalog"] },
  );
  return async (...args: A) => {
    try {
      return await cached(...args);
    } catch (err) {
      if (err instanceof FallbackResponse) return err.data as R;
      if ((err as Error)?.message === "cinegraph:fallback") return load(...args);
      throw err;
    }
  };
}

export const getHomePage = cachedPage("home", getHome);
export const getProfilePage = cachedPage("profile", getProfile);
export const getMoviePage = cachedPage("movie", getMovie);

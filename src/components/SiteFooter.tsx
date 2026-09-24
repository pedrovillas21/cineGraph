export function SiteFooter({ hasTmdb }: { hasTmdb: boolean }) {
  return (
    <footer className="mt-10 border-t border-border sm:mt-16">
      <div className="mx-auto max-w-6xl space-y-1 px-4 py-8 text-xs text-muted sm:px-6">
        <p>CineGraph · Projeto da disciplina PI3B · Centro Universitário IESB</p>
        <p>
          Avaliações:{" "}
          <a className="underline" href="https://grouplens.org/datasets/movielens/" target="_blank" rel="noreferrer">
            MovieLens (GroupLens)
          </a>
          .{" "}
          {hasTmdb && (
            <>
              Pôsteres, sinopses e títulos:{" "}
              <a className="underline" href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
                TMDB
              </a>
              . This product uses the TMDB API but is not endorsed or certified by TMDB.
            </>
          )}
        </p>
      </div>
    </footer>
  );
}

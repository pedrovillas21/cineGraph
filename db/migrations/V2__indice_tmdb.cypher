// Filmes passam a guardar o id do TMDB (links.csv do MovieLens) para buscar
// pôster e sinopse. Índice para localizar um filme pelo id do TMDB.

CREATE INDEX movie_tmdb_id IF NOT EXISTS
FOR (m:Movie) ON (m.tmdbId);

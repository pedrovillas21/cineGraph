// CineGraph — schema inicial do grafo bipartido no Neo4j.
// Vértices: (:User {id}) e (:Movie {id, title, year, genres}).
// Arestas:  (:User)-[:RATED {rating, ratedAt}]->(:Movie)
// As constraints de unicidade também criam os índices usados nos MATCH por id.

CREATE CONSTRAINT user_id IF NOT EXISTS
FOR (u:User) REQUIRE u.id IS UNIQUE;

CREATE CONSTRAINT movie_id IF NOT EXISTS
FOR (m:Movie) REQUIRE m.id IS UNIQUE;

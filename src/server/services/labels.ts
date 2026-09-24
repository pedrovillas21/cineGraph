// Textos para o usuário final: gêneros em português e nomes de perfil.

const GENRES_PT: Record<string, string> = {
  Action: "Ação",
  Adventure: "Aventura",
  Animation: "Animação",
  Children: "Infantil",
  Comedy: "Comédia",
  Crime: "Crime",
  Documentary: "Documentário",
  Drama: "Drama",
  Fantasy: "Fantasia",
  "Film-Noir": "Noir",
  Horror: "Terror",
  IMAX: "IMAX",
  Musical: "Musical",
  Mystery: "Mistério",
  Romance: "Romance",
  "Sci-Fi": "Ficção científica",
  Thriller: "Suspense",
  War: "Guerra",
  Western: "Faroeste",
};

export function genrePt(genre: string): string {
  return GENRES_PT[genre] ?? genre;
}

/** "Drama", "Drama e Suspense" */
export function joinPt(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

export function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts[parts.length - 1].replace(/\D/g, "").slice(0, 3) || parts.map((p) => p[0]).join("").slice(0, 2);
}

/** Cor estável por perfil, para o avatar. */
export function avatarHue(id: number): number {
  return (id * 47) % 360;
}

import Image from "next/image";

/**
 * Pôster do TMDB. Com `width` tem tamanho fixo; sem ele ocupa a largura do
 * container (proporção 2:3). Sem imagem, mostra um bloco com o título.
 */
export function Poster({
  url,
  title,
  width,
  className = "",
  priority = false,
}: {
  url: string | null;
  title: string;
  width?: number;
  className?: string;
  /** Carrega já (imagem principal da página), sem esperar a rolagem. */
  priority?: boolean;
}) {
  const fixed = width ? { width, height: Math.round(width * 1.5) } : undefined;
  if (!url) {
    return (
      <div
        aria-hidden
        className={`flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-border to-surface-2 p-2 text-center text-xs font-medium text-muted ${fixed ? "" : "aspect-[2/3] w-full"} ${className}`}
        style={fixed}
      >
        {fixed && width! < 60 ? title.charAt(0) : title}
      </div>
    );
  }
  return (
    <Image
      src={url}
      alt={`Pôster de ${title}`}
      width={fixed?.width ?? 342}
      height={fixed?.height ?? 513}
      className={`shrink-0 rounded-lg object-cover ${fixed ? "" : "aspect-[2/3] h-auto w-full"} ${className}`}
      {...(priority ? { priority: true } : { loading: "lazy" as const })}
    />
  );
}

import { Stagger } from "./motion";

const itemWidth = {
  /** Pôsteres: cabem 2 e meio, o que mostra que dá para deslizar. */
  movie: "*:w-[40%]",
  /** Cards de perfil/pessoa: um inteiro e a ponta do próximo. */
  card: "*:w-[80%]",
};

/**
 * No celular vira uma fileira com rolagem lateral (em vez de empilhar tudo e
 * alongar a página); a partir de `sm` volta a ser a grade descrita em `grid`.
 * Os itens entram em cascata quando a fileira aparece na tela; com `as="ul"`
 * cada filho já vira um `<li>`.
 */
export function Rail({
  grid,
  size = "movie",
  as = "div",
  children,
}: {
  /** Classes da grade a partir de `sm`, ex.: "sm:grid-cols-4 sm:gap-4". */
  grid: string;
  size?: keyof typeof itemWidth;
  as?: "div" | "ul";
  children: React.ReactNode;
}) {
  return (
    <Stagger
      as={as}
      className={`no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 pt-1 *:shrink-0 *:snap-start ${itemWidth[size]} sm:mx-0 sm:grid sm:overflow-visible sm:p-0 sm:*:w-auto ${grid}`}
    >
      {children}
    </Stagger>
  );
}

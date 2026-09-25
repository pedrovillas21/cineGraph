"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { GenreShelf, MovieAudience, MovieCard, MovieSuggestion } from "@/server/services/catalogService";
import { Avatar } from "./Avatar";
import { Poster } from "./Poster";

/**
 * "Os favoritos do público" da tela inicial: busca de filmes com autocomplete,
 * abas por estilo e, ao escolher um filme, o painel com as pessoas que mais
 * combinam com ele (dados de /api/movies/[id]/audience).
 */

const EASE = [0.22, 1, 0.36, 1] as const;
const SPRING = { type: "spring", stiffness: 380, damping: 32 } as const;

const listMotion = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const itemMotion = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

const fmtRating = (n: number, digits = 1) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Destaca o trecho digitado no título, ignorando acentos ("orig" acha "Origem"). */
function highlight(text: string, query: string) {
  const q = norm(query.trim());
  if (!q) return text;
  let flat = "";
  const at: number[] = [];
  for (let i = 0; i < text.length; i++) {
    for (const c of norm(text[i])) {
      flat += c;
      at.push(i);
    }
  }
  const pos = flat.indexOf(q);
  if (pos < 0) return text;
  const start = at[pos];
  const end = at[pos + q.length - 1] + 1;
  return (
    <>
      {text.slice(0, start)}
      <mark className="bg-transparent font-semibold text-accent">{text.slice(start, end)}</mark>
      {text.slice(end)}
    </>
  );
}

export function PublicFavorites({ popular, shelves }: { popular: MovieCard[]; shelves: GenreShelf[] }) {
  const tabs = [{ genre: "all", label: "Todos", movies: popular }, ...shelves];
  const [genre, setGenre] = useState("all");
  const [selected, setSelected] = useState<{ movie: MovieCard; wide: boolean } | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();
  const current = tabs.find((t) => t.genre === genre) ?? tabs[0];

  const open = (movie: MovieCard) => {
    opener.current = document.activeElement as HTMLElement | null;
    setSelected({ movie, wide: window.matchMedia("(min-width: 640px)").matches });
  };
  // Estável entre renders: o painel usa no efeito do Esc sem se reinscrever.
  const close = useCallback(() => {
    setSelected(null);
    opener.current?.focus();
  }, []);

  // Setas movem entre as abas de estilo (padrão de tabs acessíveis).
  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (i + delta + tabs.length) % tabs.length;
    setGenre(tabs[next].genre);
    tabRefs.current[next]?.focus();
  };

  return (
    <div>
      <MovieSearch onPick={open} />

      <div
        role="tablist"
        aria-label="Estilos de filme"
        className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:mt-5 sm:flex-wrap sm:overflow-visible sm:px-0"
      >
        {tabs.map((t, i) => {
          const on = t.genre === current.genre;
          return (
            <button
              key={t.genre}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              id={`${baseId}-tab-${t.genre}`}
              role="tab"
              type="button"
              aria-selected={on}
              aria-controls={`${baseId}-panel`}
              tabIndex={on ? 0 : -1}
              onClick={() => setGenre(t.genre)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={`relative isolate min-h-10 shrink-0 rounded-full px-4 text-sm font-medium transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                on ? "text-background" : "text-muted hover:text-foreground"
              }`}
            >
              {on && (
                <motion.span
                  layoutId={`${baseId}-pill`}
                  className="absolute inset-0 -z-10 rounded-full bg-foreground"
                  transition={SPRING}
                />
              )}
              {!on && <span aria-hidden className="absolute inset-0 -z-10 rounded-full border border-border bg-surface" />}
              {t.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.ul
          key={current.genre}
          id={`${baseId}-panel`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${current.genre}`}
          variants={listMotion}
          initial="hidden"
          animate="show"
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          className="no-scrollbar -mx-4 mt-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 pt-1 *:w-[40%] *:shrink-0 *:snap-start sm:mx-0 sm:mt-6 sm:grid sm:grid-cols-4 sm:gap-x-4 sm:gap-y-6 sm:overflow-visible sm:p-0 sm:*:w-auto lg:grid-cols-6"
        >
          {current.movies.map((m) => (
            <motion.li key={m.movieId} variants={itemMotion} className="min-w-0">
              <MovieTile movie={m} active={selected?.movie.movieId === m.movieId} onOpen={() => open(m)} />
            </motion.li>
          ))}
        </motion.ul>
      </AnimatePresence>

      <AnimatePresence>
        {selected && <AudienceSheet key={selected.movie.movieId} movie={selected.movie} wide={selected.wide} onClose={close} />}
      </AnimatePresence>
    </div>
  );
}

function MovieTile({ movie, active, onOpen }: { movie: MovieCard; active: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-expanded={active}
      className="group block w-full min-w-0 rounded-lg text-left outline-none transition-transform duration-500 ease-spring hover:-translate-y-1.5 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-background active:scale-[0.98]"
    >
      <span className="relative block overflow-hidden rounded-lg shadow-sm ring-1 ring-border transition-shadow duration-300 ease-out-soft group-hover:shadow-[0_22px_44px_-20px_rgb(0_0_0/0.55)]">
        <Poster
          url={movie.posterUrl}
          title={movie.title}
          className="transition-transform duration-700 ease-out-soft group-hover:scale-[1.06]"
        />
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-between bg-neutral-950/90 px-3 py-2.5 text-xs font-medium text-neutral-100 transition-transform duration-400 ease-out-soft group-hover:translate-y-0 group-focus-visible:translate-y-0"
        >
          Quem combina?
          <span className="transition-transform duration-500 ease-spring group-hover:translate-x-0.5">→</span>
        </span>
      </span>
      <span className="mt-2.5 line-clamp-2 text-sm font-medium leading-snug transition-colors duration-200 group-hover:text-accent">
        {movie.title}
      </span>
      <span className="block text-xs text-muted">{[movie.year, ...movie.genres].filter(Boolean).join(" · ")}</span>
    </button>
  );
}

function MovieSearch({ onPick }: { onPick: (movie: MovieCard) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MovieSuggestion[]>([]);
  const [searched, setSearched] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const term = query.trim();

  // Busca com um respiro de 150 ms entre teclas; a resposta anterior é cancelada.
  useEffect(() => {
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/movies/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const data: { results?: MovieSuggestion[] } = await res.json();
        setResults(data.results ?? []);
        setSearched(term);
        setActive(data.results?.length ? 0 : -1);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setResults([]);
      }
    }, 150);
    return () => {
      window.clearTimeout(t);
      ctrl.abort();
    };
  }, [term]);

  const visible = term.length >= 2 ? results : [];
  const showList = open && term.length >= 2 && searched === term;

  const pick = (m: MovieSuggestion) => {
    onPick(m);
    setQuery("");
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!visible.length) return;
      e.preventDefault();
      setOpen(true);
      const d = e.key === "ArrowDown" ? 1 : -1;
      setActive((a) => (a + d + visible.length) % visible.length);
    } else if (e.key === "Enter") {
      const m = visible[active] ?? visible[0];
      if (showList && m) {
        e.preventDefault();
        pick(m);
      }
    } else if (e.key === "Escape") {
      if (showList) setOpen(false);
      else setQuery("");
    }
  };

  return (
    <div className="relative max-w-xl">
      <label htmlFor={`${listId}-input`} className="sr-only">
        Pesquisar filme
      </label>
      <svg
        aria-hidden
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <input
        id={`${listId}-input`}
        type="search"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        placeholder="Pesquisar um filme, ex.: Matrix, Toy Story…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKey}
        className="h-12 w-full rounded-full border border-border bg-surface pl-11 pr-4 text-[15px] outline-none transition-[border-color,box-shadow] duration-300 ease-out-soft placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-accent/15"
      />

      <AnimatePresence>
        {showList && (
          <motion.ul
            id={listId}
            role="listbox"
            aria-label="Filmes encontrados"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ duration: 0.2, ease: EASE }}
            className="absolute inset-x-0 top-full z-30 mt-2 max-h-[22rem] origin-top overflow-y-auto rounded-2xl border border-border bg-surface p-1.5 shadow-[0_24px_48px_-20px_rgb(0_0_0/0.45)]"
          >
            {visible.length === 0 && (
              <li className="px-3 py-3 text-sm text-muted">Nenhum filme encontrado para “{term}”.</li>
            )}
            {visible.map((m, i) => (
              <li
                key={m.movieId}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                // mousedown antes do blur do campo, senão a lista fecha antes do clique.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(m)}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 transition-colors duration-150 ${
                  i === active ? "bg-surface-2" : ""
                }`}
              >
                <Poster url={m.posterUrl} title={m.title} width={32} className="rounded-md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{highlight(m.title, term)}</span>
                  <span className="block truncate text-xs text-muted">
                    {m.originalTitle && <>{highlight(m.originalTitle, term)} · </>}
                    {[m.year, ...m.genres].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

// Respostas já buscadas nesta visita: reabrir um filme é instantâneo.
const audienceCache = new Map<number, MovieAudience>();

function AudienceSheet({ movie, wide, onClose }: { movie: MovieCard; wide: boolean; onClose: () => void }) {
  const [data, setData] = useState<MovieAudience | null>(audienceCache.get(movie.movieId) ?? null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (audienceCache.has(movie.movieId)) return;
    const ctrl = new AbortController();
    fetch(`/api/movies/${movie.movieId}/audience`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: MovieAudience) => {
        audienceCache.set(movie.movieId, d);
        setData(d);
      })
      .catch((err) => {
        if ((err as Error).name !== "AbortError") setFailed(true);
      });
    return () => ctrl.abort();
  }, [movie.movieId, attempt]);

  // Painel modal: foco no botão de fechar, Esc fecha e a página atrás não rola.
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const hidden = wide ? { x: "100%" } : { y: "100%" };

  return (
    <>
      <motion.div
        aria-hidden
        className="fixed inset-0 z-40 bg-black/45"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
      />
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={hidden}
        animate={{ x: 0, y: 0 }}
        exit={hidden}
        transition={SPRING}
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col overflow-hidden rounded-t-3xl border-t border-border bg-surface shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[27rem] sm:rounded-none sm:rounded-l-3xl sm:border-l sm:border-t-0"
      >
        <div aria-hidden className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-border sm:hidden" />

        <div className="flex items-start gap-4 border-b border-border p-5 sm:p-6">
          <Poster url={movie.posterUrl} title={movie.title} width={72} className="rounded-md shadow-md" />
          <div className="min-w-0 flex-1">
            <h3 id={titleId} className="text-lg font-semibold leading-snug">
              {movie.title}
            </h3>
            <p className="mt-0.5 text-sm text-muted">{[movie.year, ...movie.genres].filter(Boolean).join(" · ")}</p>
            {data && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-sm">
                <span className="font-semibold text-amber-600 dark:text-amber-300">★ {fmtRating(data.audienceScore)}</span>
                <span className="text-muted"> · média de {data.audienceCount.toLocaleString("pt-BR")} avaliações</span>
              </motion.p>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="-mr-2 -mt-2 grid size-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <h4 className="font-semibold">Quem mais combina com este filme</h4>
          <p className="mt-1 text-sm text-muted">
            Pessoas que amaram o filme (nota 4 ou mais) e que mais amam filmes de {data?.style ?? "o mesmo estilo"}.
          </p>

          <div className="mt-4" aria-live="polite" aria-busy={!data && !failed}>
            {failed ? (
              <div className="rounded-xl border border-border bg-background p-4 text-sm">
                <p>Não conseguimos carregar as pessoas agora.</p>
                <button
                  type="button"
                  onClick={() => {
                    setFailed(false);
                    setAttempt((a) => a + 1);
                  }}
                  className="mt-2 font-medium text-accent hover:underline"
                >
                  Tentar de novo
                </button>
              </div>
            ) : !data ? (
              <ul className="space-y-3">
                {Array.from({ length: 4 }, (_, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-2xl border border-border p-3">
                    <span className="size-11 animate-pulse rounded-full bg-surface-2" />
                    <span className="flex-1 space-y-2">
                      <span className="block h-4 w-1/2 animate-pulse rounded bg-surface-2" />
                      <span className="block h-3 w-4/5 animate-pulse rounded bg-surface-2" />
                    </span>
                  </li>
                ))}
              </ul>
            ) : data.people.length === 0 ? (
              <p className="rounded-xl border border-border bg-background p-4 text-sm text-muted">
                Ninguém deu nota 4 ou mais a este filme ainda.
              </p>
            ) : (
              <motion.ul variants={listMotion} initial="hidden" animate="show" className="space-y-3">
                {data.people.map(({ profile, rating, affinity }, i) => (
                  <motion.li key={profile.id} variants={itemMotion}>
                    <Link
                      href={`/perfil/${profile.id}`}
                      className="group flex items-center gap-3 rounded-2xl border border-border p-3 transition-[border-color,transform,box-shadow] duration-500 ease-spring hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-[0_14px_30px_-18px_rgb(0_0_0/0.35)] focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      <span className="relative">
                        <Avatar initials={profile.initials} hue={profile.hue} size={44} />
                        {i === 0 && (
                          <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-accent text-[10px] font-bold text-white ring-2 ring-surface">
                            1
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate font-semibold transition-colors group-hover:text-accent">{profile.name}</span>
                          <span className="shrink-0 text-xs font-semibold text-amber-600 dark:text-amber-300">
                            deu ★ {fmtRating(rating, rating % 1 ? 1 : 0)}
                          </span>
                        </span>
                        <span className="block truncate text-xs text-muted">Curte {profile.taste}</span>
                        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-surface-2">
                          <motion.span
                            className="block h-full rounded-full bg-user"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.round(affinity * 100)}%` }}
                            transition={{ duration: 0.8, ease: EASE, delay: 0.2 + i * 0.06 }}
                          />
                        </span>
                        <span className="mt-1 block text-xs text-muted">
                          {Math.round(affinity * 100)}% dos filmes que ama são {data.style}
                        </span>
                      </span>
                    </Link>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </div>
        </div>

        <div className="border-t border-border p-4 sm:p-5">
          <Link
            href={`/filme/${movie.movieId}`}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-white transition-[transform,box-shadow] duration-500 ease-spring hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-12px_rgb(194_65_45/0.6)] active:scale-[0.98]"
          >
            Ver detalhes do filme <span aria-hidden>→</span>
          </Link>
        </div>
      </motion.aside>
    </>
  );
}

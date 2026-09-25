"use client";

import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import type { TourData } from "@/server/services/tourService";

/**
 * Tour interativo do grafo ("Como funciona"): a pessoa escolhe alguém, aperta
 * Pesquisar e vê os 3 saltos do algoritmo acontecendo no grafo de exemplo.
 * Os números vêm prontos do servidor (tourService.ts, que roda recommend.ts);
 * aqui só se decide o que acende em cada passo.
 */

const STEP_MS = 2800;
const EASE = [0.22, 1, 0.36, 1] as const;
const SPRING = { type: "spring", stiffness: 420, damping: 24 } as const;

type Step = 0 | 1 | 2 | 3 | 4;
type NodeState = "idle" | "picked" | "origin" | "hit" | "soft" | "seen" | "dim";
type EdgeMode = "base" | "dim" | "soft" | "user" | "movie";
type Tone = "dark" | "accent" | "mute";
type Pt = { x: number; y: number };
type Layout = { w: number; h: number; pos: Record<string, Pt> };

interface NodeView {
  state: NodeState;
  badge?: string;
  tone?: Tone;
  delay: number;
}

interface EdgeView {
  key: string;
  /** Sentido em que o salto percorre a aresta (o traço e o ponto seguem esse sentido). */
  from: string;
  to: string;
  mode: EdgeMode;
  delay: number;
  rating: number;
}

// Posições feitas à mão para o grafo de exemplo (fixture.ts), quase sem cruzamentos.
// No celular o mesmo desenho fica em pé.
const WIDE: Layout = {
  w: 840,
  h: 540,
  pos: {
    "u:1": { x: 540, y: 400 },
    "u:2": { x: 380, y: 330 },
    "u:3": { x: 660, y: 230 },
    "u:4": { x: 150, y: 290 },
    "u:5": { x: 790, y: 380 },
    "m:10": { x: 500, y: 150 },
    "m:20": { x: 330, y: 470 },
    "m:30": { x: 700, y: 460 },
    "m:40": { x: 90, y: 110 },
    "m:50": { x: 760, y: 110 },
    "m:60": { x: 290, y: 160 },
  },
};

const TALL: Layout = {
  w: 360,
  h: 580,
  pos: {
    "u:1": { x: 248, y: 366 },
    "u:2": { x: 203, y: 261 },
    "u:3": { x: 138, y: 445 },
    "u:4": { x: 177, y: 109 },
    "u:5": { x: 235, y: 530 },
    "m:10": { x: 86, y: 339 },
    "m:20": { x: 300, y: 228 },
    "m:30": { x: 294, y: 471 },
    "m:40": { x: 60, y: 70 },
    "m:50": { x: 60, y: 510 },
    "m:60": { x: 92, y: 201 },
  },
};

const STEPS = [
  { kicker: "Início", label: "A rede" },
  { kicker: "Salto 1", label: "Seu perfil" },
  { kicker: "Salto 2", label: "Vizinhos" },
  { kicker: "Salto 3", label: "O que amaram" },
  { kicker: "Fim", label: "Resultado" },
];

const dec = (n: number, d = 2) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

const joinPt = (list: string[]) =>
  list.length <= 1 ? list.join("") : `${list.slice(0, -1).join(", ")} e ${list[list.length - 1]}`;

const pct = (v: number, total: number) => `${(v / total) * 100}%`;

const listMotion = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };
const itemMotion = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

export function GraphTour({ data, liveStats }: { data: TourData; liveStats?: { users: string; movies: string; edges: string } }) {
  const [origin, setOrigin] = useState(data.users[0].id);
  const [step, setStep] = useState<Step>(0);
  const [playing, setPlaying] = useState(false);
  const [focus, setFocus] = useState(0);
  const reduced = useReducedMotion() ?? false;

  // Avança sozinho enquanto está tocando; para no resultado.
  useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(() => {
      const next = Math.min(4, step + 1) as Step;
      setStep(next);
      if (next === 4) setPlaying(false);
    }, STEP_MS);
    return () => window.clearTimeout(t);
  }, [playing, step]);

  const search = (userId: number) => {
    setOrigin(userId);
    setFocus(0);
    setStep(1);
    setPlaying(true);
  };
  const goTo = (n: number) => {
    setPlaying(false);
    setStep(Math.max(0, Math.min(4, n)) as Step);
  };
  const toggle = () => {
    if (playing) return setPlaying(false);
    if (step === 0 || step === 4) {
      setFocus(0);
      setStep(1);
    }
    setPlaying(true);
  };

  const name = useMemo(() => new Map(data.users.map((u) => [u.id, u.name])), [data.users]);
  const title = useMemo(() => new Map(data.movies.map((m) => [m.id, m.title])), [data.movies]);
  const run = data.runs[origin];
  const uname = name.get(origin)!;
  const focusIdx = Math.min(focus, Math.max(0, run.recommendations.length - 1));
  const focusRec = run.recommendations[focusIdx];

  const { nodes, edges } = useMemo(() => {
    const mine = new Map(data.ratings.filter((r) => r.userId === origin).map((r) => [r.movieId, r.rating]));
    const nb = new Map(run.neighbors.map((n) => [n.userId, n]));
    const recIdx = new Map(run.recommendations.map((r, i) => [r.movieId, i]));

    // Caminho que explica a recomendação em foco: você → filmes em comum → vizinho → filme.
    const pathE = new Set<string>();
    const pathN = new Set<string>();
    if (focusRec) {
      pathN.add(`m:${focusRec.movieId}`);
      for (const s of focusRec.supporters) {
        pathE.add(`${s.userId}-${focusRec.movieId}`);
        pathN.add(`u:${s.userId}`);
        for (const m of s.via) {
          pathE.add(`${origin}-${m}`);
          pathE.add(`${s.userId}-${m}`);
          pathN.add(`m:${m}`);
        }
      }
    }

    let k = 0;
    const edges: EdgeView[] = data.ratings.map((r) => {
      const isMine = r.userId === origin;
      const toMine = !isMine && mine.has(r.movieId);
      let mode: EdgeMode = "base";
      let rev = false;
      if (step === 1) mode = isMine ? "user" : "dim";
      else if (step === 2) {
        if (isMine) mode = "soft";
        else if (toMine) [mode, rev] = ["user", true];
        else mode = "dim";
      } else if (step === 3) {
        if (isMine || toMine) mode = "soft";
        else if (nb.has(r.userId)) mode = "movie";
        else mode = "dim";
      } else if (step === 4) {
        if (!pathE.has(`${r.userId}-${r.movieId}`)) mode = "dim";
        else if (r.movieId === focusRec?.movieId) mode = "movie";
        else [mode, rev] = ["user", !isMine];
      }
      const strong = mode === "user" || mode === "movie";
      const u = `u:${r.userId}`;
      const m = `m:${r.movieId}`;
      return {
        key: `${r.userId}-${r.movieId}`,
        from: rev ? m : u,
        to: rev ? u : m,
        mode,
        delay: strong ? k++ * 0.11 : 0,
        rating: r.rating,
      };
    });

    let n = 0;
    const lit = (s: NodeState) => (s === "hit" || s === "origin" ? n++ * 0.09 + 0.15 : 0);
    const nodes: Record<string, NodeView> = {};

    for (const m of data.movies) {
      let view: Omit<NodeView, "delay"> = { state: "idle" };
      const seen = mine.has(m.id);
      const idx = recIdx.get(m.id);
      if (step === 1) view = { state: seen ? "hit" : "dim" };
      else if (step === 2) view = { state: seen ? "soft" : "dim" };
      else if (step === 3) {
        if (idx !== undefined) {
          const votes = run.recommendations[idx].supporters.length;
          view = { state: "hit", badge: `${votes} ${votes > 1 ? "votos" : "voto"}`, tone: "accent" };
        } else view = seen ? { state: "seen", badge: "já viu", tone: "mute" } : { state: "dim" };
      } else if (step === 4) {
        if (idx !== undefined) {
          const rec = run.recommendations[idx];
          view = { state: idx === focusIdx ? "hit" : "soft", badge: `#${idx + 1} · ${dec(rec.score, 1)}`, tone: "accent" };
        } else view = { state: pathN.has(`m:${m.id}`) ? "soft" : "dim" };
      }
      nodes[`m:${m.id}`] = { ...view, delay: lit(view.state) };
    }

    for (const u of data.users) {
      let view: Omit<NodeView, "delay"> = { state: "idle" };
      const neighbor = nb.get(u.id);
      if (step === 0) view = { state: u.id === origin ? "picked" : "idle" };
      else if (u.id === origin) view = { state: "origin" };
      else if (step === 1) view = { state: "dim" };
      else if (step === 2)
        view = neighbor
          ? { state: "hit", badge: `sim ${dec(neighbor.similarity)}`, tone: "dark" }
          : { state: "dim", badge: "0 em comum", tone: "mute" };
      else if (step === 3) view = { state: neighbor ? "soft" : "dim" };
      else if (step === 4) view = { state: pathN.has(`u:${u.id}`) ? "hit" : "dim" };
      nodes[`u:${u.id}`] = { ...view, delay: lit(view.state) };
    }

    return { nodes, edges };
  }, [data, origin, run, step, focusRec, focusIdx]);

  const stepKey = `${origin}-${step}-${focusIdx}`;
  const titles = [
    "A rede de gostos",
    `Salto 1 · O perfil de ${uname}`,
    "Salto 2 · Quem tem gostos parecidos",
    "Salto 3 · O que os vizinhos amaram",
    `Recomendações para ${uname}`,
  ];
  const texts = [
    "Cada pessoa e cada filme é um ponto do grafo. Cada linha é uma avaliação, e o peso dela é a nota, de 1 a 5. Escolha alguém e aperte Pesquisar.",
    `Partimos de ${uname} e seguimos cada linha até os filmes que ${uname} já avaliou. As notas mostram o que agradou mais.`,
    `De cada um desses filmes, voltamos para as outras pessoas que também o avaliaram. Quem deu notas parecidas às de ${uname} ganha similaridade maior, de 0 a 1.`,
    `Agora seguimos dos vizinhos para os filmes que ${uname} ainda não viu. Cada vizinho vota com a nota que deu, e o voto de quem é mais parecido pesa mais.`,
    "A nota prevista é a média das notas dos vizinhos, pesada pela similaridade. Toque numa recomendação para ver no grafo o caminho que a explica.",
  ];

  const canvas = (layout: Layout, compact: boolean) => (
    <GraphCanvas
      layout={layout}
      compact={compact}
      data={data}
      nodes={nodes}
      edges={edges}
      stepKey={stepKey}
      reduced={reduced}
      onPick={search}
    />
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr] lg:gap-6">
        {/* Pesquisa */}
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 lg:col-start-2 lg:row-start-1">
          <p id="tour-for" className="text-sm font-semibold text-muted">
            Recomendar filmes para
          </p>
          <div role="group" aria-labelledby="tour-for" className="mt-3 flex flex-wrap gap-2">
            {data.users.map((u) => {
              const on = u.id === origin;
              return (
                <motion.button
                  key={u.id}
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => search(u.id)}
                  aria-pressed={on}
                  className={`flex min-h-11 items-center gap-2 rounded-full border pl-1.5 pr-3.5 text-sm font-semibold transition-colors duration-300 ${
                    on ? "border-user bg-user text-surface" : "border-border bg-surface hover:border-user"
                  }`}
                >
                  <span
                    className={`grid size-7 place-items-center rounded-full text-xs transition-colors duration-300 ${
                      on ? "bg-surface text-user" : "bg-user text-surface"
                    }`}
                  >
                    {u.name[0]}
                  </span>
                  {u.name}
                </motion.button>
              );
            })}
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => search(origin)}
            className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-white transition-[filter] hover:brightness-95"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            {playing ? "Pesquisando…" : step === 4 ? "Pesquisar de novo" : "Pesquisar"}
          </motion.button>
        </div>

        {/* Grafo */}
        <section
          aria-label="Grafo de exemplo"
          className="overflow-hidden rounded-2xl border border-border bg-surface lg:col-start-1 lg:row-span-2 lg:row-start-1"
        >
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold">
                {step === 0 ? "Visão geral" : step === 4 ? "Resultado" : `Passo ${step} de 3`}
              </span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={`${origin}-${step}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className="truncate text-sm font-semibold sm:text-[15px]"
                >
                  {titles[step]}
                </motion.span>
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-full bg-user" />
                Pessoa
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-[3px] bg-movie" />
                Filme
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-foreground/30" />
                Avaliação (nota 1 a 5)
              </span>
            </div>
          </div>

          <div className="relative bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:22px_22px]">
            <p className="absolute left-4 top-3 z-10 hidden text-xs text-muted md:block">
              Dica: clique em uma pessoa do grafo para pesquisar a partir dela.
            </p>
            <div className="hidden md:block">{canvas(WIDE, false)}</div>
            <div className="px-2 pt-2 md:hidden">{canvas(TALL, true)}</div>
            <p className="px-4 pb-3 text-xs text-muted md:hidden">Toque em uma pessoa do grafo para pesquisar a partir dela.</p>
          </div>

          <div className="flex items-center gap-3 border-t border-border px-4 py-3 sm:gap-5 sm:px-5">
            <div className="flex min-w-0 flex-1 gap-2 sm:gap-3">
              {STEPS.map((s, i) => {
                const running = i === step && playing;
                return (
                  <button
                    key={s.kicker}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-current={i === step ? "step" : undefined}
                    aria-label={`${s.kicker}: ${s.label}`}
                    className={`flex min-h-11 min-w-0 flex-1 flex-col justify-center gap-1.5 text-left transition-colors ${
                      i === step ? "text-foreground" : "text-muted hover:text-foreground"
                    }`}
                  >
                    <span className="block h-1 overflow-hidden rounded-full bg-border">
                      <motion.span
                        key={running ? `run-${stepKey}` : "still"}
                        className={`block h-full rounded-full ${i < step ? "bg-user" : "bg-accent"}`}
                        initial={running ? { width: "0%" } : false}
                        animate={{ width: i <= step ? "100%" : "0%" }}
                        transition={running ? { duration: STEP_MS / 1000, ease: "linear" } : { duration: 0.4, ease: EASE }}
                      />
                    </span>
                    <span className="truncate text-[10px] font-semibold uppercase tracking-wider sm:text-[11px]">{s.kicker}</span>
                    <span className="hidden truncate text-[13px] font-semibold sm:block">{s.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex shrink-0 gap-1.5 sm:gap-2">
              <IconButton label="Passo anterior" onClick={() => goTo(step - 1)} disabled={step === 0}>
                <path d="M15 18l-6-6 6-6" />
              </IconButton>
              <IconButton label={playing ? "Pausar" : "Reproduzir"} onClick={toggle} primary>
                {playing ? (
                  <path d="M9 5v14M15 5v14" strokeWidth="3" />
                ) : (
                  <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
                )}
              </IconButton>
              <IconButton label="Próximo passo" onClick={() => goTo(step + 1)} disabled={step === 4}>
                <path d="M9 18l6-6-6-6" />
              </IconButton>
            </div>
          </div>
        </section>

        {/* Explicação do passo. No desktop a altura é a do grafo: o texto rola por dentro em vez de esticar a linha. */}
        <div className="lg:relative lg:col-start-2 lg:row-start-2 lg:min-h-0">
          <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 lg:absolute lg:inset-0 lg:overflow-y-auto">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">O que está acontecendo</p>
            <p className="sr-only" aria-live="polite">
              {titles[step]}. {texts[step]}
            </p>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${origin}-${step}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="mt-2 space-y-3.5"
              >
                <p className="text-sm leading-relaxed">{texts[step]}</p>

                {step === 0 && (
                  <>
                    <motion.div variants={listMotion} initial="hidden" animate="show" className="grid grid-cols-3 gap-2">
                      {[
                        { n: data.users.length, label: "pessoas", color: "text-user" },
                        { n: data.movies.length, label: "filmes", color: "text-movie" },
                        { n: data.ratings.length, label: "avaliações", color: "" },
                      ].map((s) => (
                        <motion.div key={s.label} variants={itemMotion} className="rounded-xl border border-border bg-background px-3 py-2.5">
                          <span className={`block text-2xl font-bold ${s.color}`}>{s.n}</span>
                          <span className="text-xs text-muted">{s.label}</span>
                        </motion.div>
                      ))}
                    </motion.div>
                    <p className="text-[13px] leading-relaxed text-muted">
                      Este é um grafo pequeno, de exemplo.{" "}
                      {liveStats
                        ? `No CineGraph de verdade são ${liveStats.users} pessoas, ${liveStats.movies} filmes e ${liveStats.edges} avaliações do MovieLens, e os saltos são exatamente os mesmos.`
                        : "Com os dados completos do MovieLens são centenas de pessoas e milhares de filmes, e os saltos são exatamente os mesmos."}
                    </p>
                  </>
                )}

                {step === 1 && (
                  <motion.ul variants={listMotion} initial="hidden" animate="show" className="space-y-2">
                    {data.ratings
                      .filter((r) => r.userId === origin)
                      .map((r) => (
                        <motion.li
                          key={r.movieId}
                          variants={itemMotion}
                          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3.5 py-3"
                        >
                          <span className="text-sm font-semibold">{title.get(r.movieId)}</span>
                          <span className="flex gap-1" role="img" aria-label={`nota ${r.rating}`}>
                            {[1, 2, 3, 4, 5].map((p) => (
                              <motion.span
                                key={p}
                                className={`size-3 rounded-[3px] ${p <= r.rating ? "bg-user" : "bg-border"}`}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ ...SPRING, delay: 0.25 + p * 0.04 }}
                              />
                            ))}
                          </span>
                        </motion.li>
                      ))}
                  </motion.ul>
                )}

                {step === 2 && (
                  <>
                    <motion.ul variants={listMotion} initial="hidden" animate="show" className="space-y-2">
                      {run.neighbors.map((n) => (
                        <motion.li key={n.userId} variants={itemMotion} className="space-y-2 rounded-xl border border-border bg-background px-3.5 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-2 text-sm font-semibold">
                              <span className="grid size-7 place-items-center rounded-full bg-user text-xs text-surface">
                                {name.get(n.userId)![0]}
                              </span>
                              {name.get(n.userId)}
                            </span>
                            <span className="font-mono text-sm font-bold text-user">{dec(n.similarity)}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                            <motion.div
                              className="h-full rounded-full bg-user"
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(4, n.similarity * 100)}%` }}
                              transition={{ duration: 0.8, ease: EASE, delay: 0.3 }}
                            />
                          </div>
                          <p className="text-xs text-muted">Em comum: {joinPt(n.via.map((m) => title.get(m)!))}</p>
                          <p className="font-mono text-xs text-muted">
                            sim = {n.dot} ÷ ({dec(run.norm)} × {dec(data.runs[n.userId].norm)})
                          </p>
                        </motion.li>
                      ))}
                    </motion.ul>
                    {run.unreachable.length > 0 && (
                      <p className="text-[13px] leading-relaxed text-muted">
                        {joinPt(run.unreachable.map((id) => name.get(id)!))}{" "}
                        {run.unreachable.length > 1 ? "não avaliaram" : "não avaliou"} nenhum filme em comum com {uname}, então fica
                        {run.unreachable.length > 1 ? "m" : ""} de fora.
                      </p>
                    )}
                  </>
                )}

                {step === 3 && (
                  <>
                    <motion.ul variants={listMotion} initial="hidden" animate="show" className="space-y-2">
                      {run.recommendations.map((r) => (
                        <motion.li key={r.movieId} variants={itemMotion} className="rounded-xl border border-border bg-background px-3.5 py-3">
                          <p className="text-sm font-semibold">{title.get(r.movieId)}</p>
                          <p className="mt-1 text-xs text-muted">
                            {r.supporters.map((s) => `${name.get(s.userId)} deu ${s.rating}`).join(" · ")}
                          </p>
                        </motion.li>
                      ))}
                    </motion.ul>
                    <p className="text-[13px] leading-relaxed text-muted">
                      Filmes que {uname} já viu ficam de fora: não faz sentido recomendar o que já foi assistido.
                    </p>
                  </>
                )}

                {step === 4 && (
                  <motion.ul variants={listMotion} initial="hidden" animate="show" className="space-y-2">
                    {run.recommendations.map((r, i) => {
                      const s = r.supporters[0];
                      const others = r.supporters.length - 1;
                      const on = i === focusIdx;
                      return (
                        <motion.li key={r.movieId} variants={itemMotion}>
                          <button
                            type="button"
                            onClick={() => setFocus(i)}
                            aria-pressed={on}
                            className={`w-full space-y-2 rounded-xl border px-3.5 py-3 text-left transition-[border-color,box-shadow,background-color] duration-300 ${
                              on ? "border-accent bg-surface ring-3 ring-accent/15" : "border-border bg-background hover:border-accent"
                            }`}
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-accent text-[13px] font-bold text-white">
                                {i + 1}
                              </span>
                              <span className="flex-1 text-sm font-semibold">{title.get(r.movieId)}</span>
                              <span className="font-mono text-sm font-bold text-accent">{dec(r.score, 1)}</span>
                            </span>
                            <span className="block text-[13px] leading-snug">
                              Porque {name.get(s.userId)}, que também viu {joinPt(s.via.map((m) => title.get(m)!))}, deu nota{" "}
                              {s.rating}.
                              {others > 0 && ` Mais ${others} ${others > 1 ? "vizinhos confirmam" : "vizinho confirma"}.`}
                            </span>
                            <span className="block font-mono text-xs text-muted">
                              ({r.supporters.map((x) => `${dec(x.similarity)}×${x.rating}`).join(" + ")}) ÷ (
                              {r.supporters.map((x) => dec(x.similarity)).join(" + ")}) = {dec(r.score)}
                            </span>
                          </button>
                        </motion.li>
                      );
                    })}
                  </motion.ul>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  primary,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.92 }}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`grid size-11 place-items-center rounded-xl border transition-colors disabled:cursor-default disabled:opacity-40 ${
        primary ? "border-foreground bg-foreground text-background" : "border-border bg-surface hover:border-foreground"
      }`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
    </motion.button>
  );
}

function GraphCanvas({
  layout,
  compact,
  data,
  nodes,
  edges,
  stepKey,
  reduced,
  onPick,
}: {
  layout: Layout;
  compact: boolean;
  data: TourData;
  nodes: Record<string, NodeView>;
  edges: EdgeView[];
  stepKey: string;
  reduced: boolean;
  onPick: (userId: number) => void;
}) {
  const { w, h, pos } = layout;
  const at = (p: Pt) => ({ left: pct(p.x, w), top: pct(p.y, h) });

  return (
    <div className="relative w-full" style={{ aspectRatio: `${w} / ${h}` }}>
      <svg viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 size-full overflow-visible" aria-hidden>
        {edges.map((e) => {
          const a = pos[e.from];
          const b = pos[e.to];
          const strong = e.mode === "user" || e.mode === "movie";
          const lit = strong || e.mode === "soft";
          const color = e.mode === "movie" ? "stroke-movie" : "stroke-user";
          return (
            <g key={e.key}>
              <motion.line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className="stroke-foreground/15"
                strokeWidth={2}
                initial={false}
                animate={{ opacity: e.mode === "dim" ? 0.35 : 1 }}
                transition={{ duration: 0.5 }}
              />
              <AnimatePresence>
                {lit && (
                  <motion.line
                    key={stepKey}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    className={color}
                    strokeWidth={strong ? 3 : 2}
                    strokeLinecap="round"
                    initial={{ pathLength: strong ? 0 : 1, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: strong ? 1 : 0.45 }}
                    exit={{ opacity: 0, transition: { duration: 0.25 } }}
                    transition={{
                      pathLength: { duration: 0.7, ease: EASE, delay: e.delay },
                      opacity: { duration: 0.25, delay: e.delay },
                    }}
                  />
                )}
              </AnimatePresence>
              {strong && !reduced && (
                <motion.circle
                  key={`dot-${stepKey}`}
                  r={compact ? 4 : 5}
                  className={e.mode === "movie" ? "fill-movie" : "fill-user"}
                  initial={{ cx: a.x, cy: a.y, opacity: 0 }}
                  animate={{ cx: [a.x, b.x], cy: [a.y, b.y], opacity: [0, 1, 1, 0] }}
                  transition={{
                    default: { duration: 1.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.5, delay: e.delay + 0.7 },
                    opacity: { duration: 1.5, times: [0, 0.15, 0.85, 1], repeat: Infinity, repeatDelay: 0.5, delay: e.delay + 0.7 },
                  }}
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Nota de cada aresta percorrida, no meio da linha. */}
      {edges.map((e) => {
        const strong = e.mode === "user" || e.mode === "movie";
        const a = pos[e.from];
        const b = pos[e.to];
        return (
          <AnimatePresence key={e.key}>
            {strong && (
              <motion.span
                key={stepKey}
                style={at({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })}
                className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border bg-surface px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none md:text-[11px] ${
                  e.mode === "movie" ? "border-movie text-movie" : "border-user text-user"
                }`}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ ...SPRING, delay: e.delay + 0.5 }}
              >
                {e.rating}★
              </motion.span>
            )}
          </AnimatePresence>
        );
      })}

      {data.movies.map((m) => (
        <GraphNode key={m.id} kind="movie" label={m.title} style={at(pos[`m:${m.id}`])} view={nodes[`m:${m.id}`]} compact={compact} />
      ))}
      {data.users.map((u) => (
        <GraphNode
          key={u.id}
          kind="user"
          label={u.name}
          style={at(pos[`u:${u.id}`])}
          view={nodes[`u:${u.id}`]}
          compact={compact}
          reduced={reduced}
          onPick={() => onPick(u.id)}
        />
      ))}
    </div>
  );
}

const TONES: Record<Tone, string> = {
  dark: "bg-foreground text-background",
  accent: "bg-accent text-surface",
  mute: "bg-surface-2 text-muted",
};

function GraphNode({
  kind,
  label,
  style,
  view,
  compact,
  reduced,
  onPick,
}: {
  kind: "user" | "movie";
  label: string;
  style: React.CSSProperties;
  view: NodeView;
  compact: boolean;
  reduced?: boolean;
  onPick?: () => void;
}) {
  const { state } = view;
  const scale = state === "origin" ? 1.2 : state === "hit" ? 1.14 : 1;
  const fade = state === "dim" ? 0.25 : state === "seen" ? 0.45 : state === "soft" ? 0.8 : 1;
  const size = compact ? "size-9" : "size-11";
  const tint = kind === "user" ? "user" : "movie";
  const ring =
    state === "hit"
      ? tint === "user"
        ? "ring-4 ring-user/25"
        : "ring-4 ring-movie/25"
      : state === "picked"
        ? "ring-2 ring-user ring-offset-2 ring-offset-surface"
        : "";

  return (
    <motion.div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ ...style, zIndex: state === "origin" ? 4 : state === "hit" ? 3 : 1 }}
      initial={false}
      animate={{ scale }}
      transition={{ ...SPRING, delay: view.delay }}
    >
      <motion.div className="relative" initial={false} animate={{ opacity: fade }} transition={{ duration: 0.5, delay: view.delay }}>
        {state === "origin" && !reduced && (
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-user"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.9, opacity: 0 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        {kind === "user" ? (
          <button
            type="button"
            onClick={onPick}
            aria-label={`Pesquisar recomendações para ${label}`}
            className={`${size} ${ring} grid place-items-center rounded-full border-2 border-surface bg-user text-sm font-bold text-surface shadow-md transition-shadow duration-300 hover:ring-4 hover:ring-user/25 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foreground`}
          >
            {label[0]}
          </button>
        ) : (
          <div className={`${size} ${ring} grid place-items-center rounded-xl border-2 border-surface bg-movie text-surface shadow-md transition-shadow duration-300`}>
            <svg width={compact ? 16 : 20} height={compact ? 16 : 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M7 3v18M17 3v18M3 7.5h4M3 12h18M3 16.5h4M17 7.5h4M17 16.5h4" />
            </svg>
          </div>
        )}
      </motion.div>
      <motion.span
        className="pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-surface/90 px-1.5 py-0.5 text-[11px] font-semibold md:text-xs"
        initial={false}
        animate={{ opacity: state === "dim" ? 0.35 : state === "seen" ? 0.55 : 1 }}
        transition={{ duration: 0.5 }}
      >
        {label}
      </motion.span>
      <AnimatePresence>
        {view.badge && (
          <motion.span
            key={view.badge}
            className={`pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-1 font-mono text-[10px] font-semibold leading-none md:text-[11px] ${TONES[view.tone ?? "dark"]}`}
            initial={{ opacity: 0, y: 6, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
            transition={{ ...SPRING, delay: view.delay }}
          >
            {view.badge}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

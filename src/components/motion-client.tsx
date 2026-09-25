"use client";

import { Children, useEffect, useLayoutEffect, useRef, useState } from "react";
import { inView } from "motion";

type RevealState = "idle" | "armed" | "in";

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * "idle" no servidor e em tudo que já está na tela ao carregar (aparece na
 * hora, sem esperar JS). Abaixo da dobra vira "armed" (escondido, antes da
 * primeira pintura) e "in" quando entra na tela, o que dispara a animação CSS
 * definida em globals.css.
 */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [state, setState] = useState<RevealState>("idle");

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
    setState("armed");
    const stop = inView(
      el,
      () => {
        setState("in");
        stop();
      },
      { amount: 0.1 },
    );
    return stop;
  }, []);

  return [ref, state] as const;
}

export function InViewReveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const [ref, state] = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={className} data-reveal-self={state}>
      {children}
    </div>
  );
}

export function InViewStagger({
  children,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "ul" | "ol";
}) {
  const [ref, state] = useReveal<HTMLElement>();
  const Tag = as as "div";
  const Item = as === "div" ? "div" : "li";
  return (
    <Tag ref={ref as React.Ref<HTMLDivElement>} className={className} data-reveal={state}>
      {Children.toArray(children).map((child, i) => (
        <Item key={i} className="min-w-0" style={{ "--i": Math.min(i, 11) } as React.CSSProperties}>
          {child}
        </Item>
      ))}
    </Tag>
  );
}

/** Número que conta de 0 até `value` ao carregar (o HTML já chega com o valor final). */
export function CountUp({
  value,
  decimals = 0,
  suffix = "",
  delay = 0.3,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const format = (n: number) =>
    n.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const fmt = (n: number) =>
      n.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
    const start = performance.now() + delay * 1000;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / 1400));
      el.textContent = fmt(value * (1 - Math.pow(1 - t, 4)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.textContent = fmt(value);
    };
  }, [value, decimals, suffix, delay]);

  return (
    <span ref={ref} className="tabular-nums">
      {format(value)}
    </span>
  );
}

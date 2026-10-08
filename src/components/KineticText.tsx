import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&*+-/<>[]{}01";
const rand = (a: number, b: number) => Math.random() * (b - a) + a;
const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));

export const KINETIC_ANIMS = [
  "scramble",
  "typewriter",
  "splitflap",
  "stagger",
  "blur",
  "glitch",
  "ink",
  "curtain",
  "flip",
  "wave",
  "shimmer",
  "glow",
  "liquid",
  "marquee",
  "rotator",
  "magnet",
  "scrub",
  "scatter",
  "pressure",
  "distort",
  "shatter",
  "dissolve",
  "fold",
  "terminal",
  "varfont",
  "matrix",
  "morph",
  "chroma",
  "gravity",
] as const;

export type KineticAnim = (typeof KINETIC_ANIMS)[number];

export function kineticAnimFor(text: string): KineticAnim {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return KINETIC_ANIMS[(h >>> 0) % KINETIC_ANIMS.length]!;
}

function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduce(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return reduce;
}

function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setOn(entry.isIntersecting);
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, on] as const;
}

function glyphStyle(index: number, count: number, extra?: CSSProperties): CSSProperties {
  const len = Math.max(count - 1, 1);
  return {
    ["--i" as string]: index,
    ["--d" as string]: `${((index / len) * 420).toFixed(0)}ms`,
    ...extra,
  };
}

function Glyphs({
  text,
  scatter,
  shatter,
}: {
  text: string;
  scatter?: boolean;
  shatter?: boolean;
}) {
  const chars = [...text];
  const flight = useMemo(() => {
    if (!shatter) return [];
    return chars.map(() => ({
      tx: `${rand(-80, 80).toFixed(0)}px`,
      ty: `${rand(-48, 48).toFixed(0)}px`,
      tr: `${rand(-70, 70).toFixed(0)}deg`,
    }));
  }, [shatter, text]);

  return (
    <>
      {chars.map((ch, i) => (
        <span
          key={`${text}-${i}`}
          className="k-ch"
          style={glyphStyle(i, chars.length, shatter ? { ["--tx" as string]: flight[i]?.tx, ["--ty" as string]: flight[i]?.ty, ["--tr" as string]: flight[i]?.tr } : undefined)}
          data-scatter={scatter ? "1" : undefined}
        >
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </>
  );
}

export function KineticText({ text, anim, className = "" }: { text: string; anim?: KineticAnim; className?: string }) {
  const reduce = useReducedMotion();
  const kind = anim ?? kineticAnimFor(text);
  if (reduce || !text.trim()) return <span className={className}>{text}</span>;
  return <KineticInner text={text} kind={kind} className={className} />;
}

function KineticInner({ text, kind, className }: { text: string; kind: KineticAnim; className: string }) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const [shown, setShown] = useState(text);
  const [swap, setSwap] = useState(false);
  const [rotator, setRotator] = useState(text);
  const [scattered, setScattered] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (kind !== "scramble") return;
    if (!inView) {
      setShown("");
      return;
    }
    let revealed = 0;
    let frame = 0;
    const timer = window.setInterval(() => {
      frame++;
      let out = "";
      for (let i = 0; i < text.length; i++) {
        const ch = text[i]!;
        if (ch === " ") {
          out += " ";
          continue;
        }
        out += i < revealed ? ch : CHARS[randInt(0, CHARS.length - 1)];
      }
      setShown(out);
      if (frame % 3 === 0) revealed++;
      if (revealed > text.length) {
        window.clearInterval(timer);
        setShown(text);
      }
    }, 40);
    return () => window.clearInterval(timer);
  }, [kind, text, inView]);

  useEffect(() => {
    if (kind !== "typewriter" && kind !== "terminal") return;
    if (!inView) {
      setShown("");
      return;
    }
    let cancelled = false;
    let timer = 0;
    const type = (word: string, done: () => void) => {
      let i = 0;
      timer = window.setInterval(() => {
        if (cancelled) return;
        setShown(word.slice(0, i + 1));
        i++;
        if (i > word.length) {
          window.clearInterval(timer);
          done();
        }
      }, kind === "terminal" ? 48 : 42);
    };
    const erase = (done: () => void) => {
      let current = text;
      timer = window.setInterval(() => {
        if (cancelled) return;
        current = current.slice(0, -1);
        setShown(current);
        if (!current) {
          window.clearInterval(timer);
          done();
        }
      }, 28);
    };
    const once = () => type(text, () => undefined);
    const loop = () =>
      type(text, () => {
        window.setTimeout(() => {
          if (cancelled) return;
          erase(() => {
            if (cancelled) return;
            window.setTimeout(loop, 280);
          });
        }, 900);
      });
    if (kind === "terminal") loop();
    else once();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [kind, text, inView]);

  useEffect(() => {
    if (kind !== "splitflap" || !inView) return;
    const finals = [...text];
    const current = finals.map((ch) => (ch === " " ? " " : CHARS[randInt(0, CHARS.length - 1)]!));
    setShown(current.join(""));
    const timers = finals.map((finalChar, i) => {
      if (finalChar === " ") return 0;
      let count = 0;
      const total = randInt(6, 14);
      return window.setInterval(() => {
        count++;
        current[i] = count >= total ? finalChar : CHARS[randInt(0, CHARS.length - 1)]!;
        setShown(current.join(""));
        if (count >= total) window.clearInterval(timers[i]);
      }, 42 + i * 6);
    });
    return () => timers.forEach((id) => window.clearInterval(id));
  }, [kind, text, inView]);

  useEffect(() => {
    if (kind !== "rotator" || !inView) return;
    const words = text.split(/\s+/).filter(Boolean);
    const cycle = words.length > 1 ? words : [text];
    let i = 0;
    setRotator(cycle[0]!);
    const timer = window.setInterval(() => {
      i = (i + 1) % cycle.length;
      setRotator(cycle[i]!);
    }, 1800);
    return () => window.clearInterval(timer);
  }, [kind, text, inView]);

  useEffect(() => {
    if (kind !== "morph" || !inView) return;
    const timer = window.setInterval(() => setSwap((value) => !value), 2200);
    return () => window.clearInterval(timer);
  }, [kind, inView]);

  useEffect(() => {
    if (kind !== "scrub" && kind !== "chroma") return;
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      if (kind === "scrub") {
        let progress = 1 - (rect.top + rect.height / 2) / (vh + rect.height / 2);
        progress = Math.max(0, Math.min(1, progress));
        el.style.setProperty("--p", `${(progress * 100).toFixed(1)}%`);
      } else {
        const center = vh / 2;
        const stageCenter = rect.top + rect.height / 2;
        const offset = Math.max(-1, Math.min(1, (stageCenter - center) / (vh / 2)));
        const mag = Math.abs(offset) * 6;
        el.style.textShadow = `${offset * mag}px 0 rgba(26,122,69,.55), ${-offset * mag}px 0 rgba(47,157,95,.45)`;
      }
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [kind, ref]);

  useEffect(() => {
    if (kind !== "matrix" || !inView) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const word = text.replace(/\s+/g, " ").slice(0, 18).toUpperCase();
    const fontSize = 18;
    const cols = Math.max(8, Math.ceil(canvas.width / fontSize));
    const drops = Array.from({ length: cols }, () => -randInt(0, 8));
    const locked: Array<{ char: string; row: number } | null> = Array.from({ length: cols }, () => null);
    const start = Math.max(0, Math.floor(cols / 2 - word.length / 2));
    for (let i = 0; i < word.length; i++) {
      const col = start + i;
      if (col < cols && word[i] !== " ") locked[col] = { char: word[i]!, row: 2 };
    }
    let raf = 0;
    let frames = 0;
    const draw = () => {
      ctx.fillStyle = "rgba(238, 246, 241, 0.35)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px "IBM Plex Sans", sans-serif`;
      let done = true;
      for (let c = 0; c < cols; c++) {
        const target = locked[c];
        const x = c * fontSize;
        if (target && drops[c]! >= target.row) {
          ctx.fillStyle = "#1a7a45";
          ctx.fillText(target.char, x, target.row * fontSize + 4);
        } else {
          done = false;
          ctx.fillStyle = "rgba(13, 31, 20, 0.45)";
          ctx.fillText(CHARS[randInt(0, CHARS.length - 1)]!, x, drops[c]! * fontSize);
          drops[c] = (drops[c] ?? 0) + 1;
          if (drops[c]! * fontSize > canvas.height) drops[c] = 0;
        }
      }
      frames++;
      if (!done && frames < 90) raf = requestAnimationFrame(draw);
    };
    ctx.fillStyle = "#eef6f1";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    draw();
    return () => cancelAnimationFrame(raf);
  }, [kind, text, inView]);

  const onPointer = (event: PointerEvent<HTMLSpanElement>) => {
    const root = ref.current;
    if (!root) return;
    const spans = [...root.querySelectorAll<HTMLElement>(".k-ch")];
    const rect = root.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    if (kind === "magnet") {
      spans.forEach((span) => {
        const r = span.getBoundingClientRect();
        const cx = r.left - rect.left + r.width / 2;
        const cy = r.top - rect.top + r.height / 2;
        const dx = mx - cx;
        const dy = my - cy;
        const dist = Math.max(28, Math.hypot(dx, dy));
        const pull = Math.min(1, 70 / dist);
        span.style.transform = `translate(${dx * pull * 0.28}px, ${dy * pull * 0.28}px)`;
      });
    }
    if (kind === "pressure") {
      spans.forEach((span) => {
        const r = span.getBoundingClientRect();
        const cx = r.left - rect.left + r.width / 2;
        const wght = Math.max(360, 900 - Math.abs(mx - cx) * 8);
        span.style.fontVariationSettings = `"wght" ${wght.toFixed(0)}, "opsz" 48`;
      });
    }
    if (kind === "distort") {
      spans.forEach((span) => {
        const r = span.getBoundingClientRect();
        const cx = r.left - rect.left + r.width / 2;
        const dist = mx - cx;
        const proximity = Math.max(0, 1 - Math.abs(dist) / 90);
        const skew = (dist > 0 ? -1 : 1) * proximity * 14;
        span.style.transform = `skewX(${skew}deg) scale(${1 + proximity * 0.28})`;
      });
    }
  };

  const clearPointer = () => {
    ref.current?.querySelectorAll<HTMLElement>(".k-ch").forEach((span) => {
      span.style.transform = "";
      span.style.fontVariationSettings = "";
    });
  };

  const scatterOn = () => {
    const spans = ref.current?.querySelectorAll<HTMLElement>(".k-ch");
    spans?.forEach((span) => {
      span.style.transform = `translate(${rand(-28, 28)}px, ${rand(-16, 16)}px) rotate(${rand(-24, 24)}deg)`;
    });
    setScattered(true);
  };

  const interactive = kind === "magnet" || kind === "pressure" || kind === "distort";
  const reveal = ["stagger", "blur", "flip", "gravity", "wave", "liquid", "shimmer", "glow", "varfont", "ink", "curtain"].includes(kind);

  return (
    <span
      ref={ref}
      className={`kinetic kinetic-${kind}${inView ? " is-in" : ""}${swap ? " is-swap" : ""}${scattered ? " is-scattered" : ""} ${className}`.trim()}
      data-anim={kind}
      aria-label={text}
      onPointerMove={interactive ? onPointer : undefined}
      onPointerLeave={interactive || kind === "scatter" ? () => { clearPointer(); setScattered(false); } : undefined}
      onPointerEnter={kind === "scatter" ? scatterOn : undefined}
    >
      {kind === "scramble" || kind === "typewriter" || kind === "terminal" || kind === "splitflap" ? (
        <span className="k-line">{shown || "\u00A0"}</span>
      ) : null}
      {kind === "glitch" ? (
        <span className="k-glitch" data-text={text}>
          {text}
        </span>
      ) : null}
      {kind === "ink" ? (
        <span className="k-ink">
          <span className="k-line">{text}</span>
          <svg className="k-ink-line" viewBox="0 0 260 18" aria-hidden="true">
            <path d="M4 10 Q 60 2, 130 9 T 256 8" />
          </svg>
        </span>
      ) : null}
      {kind === "curtain" ? (
        <span className="k-curtain">
          <span className="k-line">{text}</span>
          <span className="k-curtain-bar" />
        </span>
      ) : null}
      {kind === "marquee" ? (
        <span className="k-marquee">
          <span>{text}</span>
          <span>{text}</span>
          <span>{text}</span>
        </span>
      ) : null}
      {kind === "rotator" ? <span className="k-rotator" key={rotator}>{rotator}</span> : null}
      {kind === "morph" ? (
        <span className="k-morph">
          <span className="k-a">{text}</span>
          <span className="k-b">{text.toUpperCase()}</span>
        </span>
      ) : null}
      {kind === "matrix" ? <canvas ref={canvasRef} className="k-matrix" width={280} height={54} aria-hidden="true" /> : null}
      {reveal || kind === "magnet" || kind === "pressure" || kind === "distort" || kind === "scatter" || kind === "shatter" || kind === "dissolve" || kind === "fold" || kind === "scrub" || kind === "chroma" ? (
        kind === "shimmer" || kind === "glow" || kind === "varfont" || kind === "dissolve" || kind === "fold" || kind === "scrub" || kind === "chroma" ? (
          <span className="k-line">{text}</span>
        ) : kind === "ink" || kind === "curtain" ? null : (
          <Glyphs text={text} shatter={kind === "shatter"} />
        )
      ) : null}
    </span>
  );
}

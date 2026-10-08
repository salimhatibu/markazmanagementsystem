import { useEffect, useRef, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

const ORDER = ["/", "/students", "/teachers", "/expenses", "/reports", "/blog", "/settings"];

const FLOW =
  ".hero, .desk-section, .panel, .page-header, .stat, .hadith, .toolbar, .board, .table-wrap, .choices, .choices-header, .blog-issue, .paper-lead, .paper-briefs, .paper-series-head";

let previousPath = "/";
let currentPath = "/";

function rank(path: string) {
  if (path.startsWith("/students/")) return 1.5;
  if (path.startsWith("/teachers/")) return 2.5;
  if (path.startsWith("/blog")) return 5.5;
  const index = ORDER.indexOf(path);
  return index === -1 ? 99 : index;
}

export function PageSlide({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  if (pathname !== currentPath) {
    previousPath = currentPath;
    currentPath = pathname;
  }
  const direction = rank(pathname) < rank(previousPath) ? "back" : "forward";

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nodes = [...root.querySelectorAll<HTMLElement>(FLOW)];
    if (reduce) {
      nodes.forEach((node) => node.classList.add("is-flow"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-flow");
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.14, rootMargin: "0px 0px -6% 0px" },
    );
    nodes.forEach((node, index) => {
      node.style.setProperty("--flow-d", `${Math.min(index % 6, 5) * 70}ms`);
      io.observe(node);
    });
    return () => io.disconnect();
  }, [pathname]);

  return (
    <div ref={ref} key={pathname} className="page-slide" data-direction={direction}>
      {children}
    </div>
  );
}

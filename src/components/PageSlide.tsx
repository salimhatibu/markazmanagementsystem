import { type ReactNode } from "react";
import { useLocation } from "react-router-dom";

const ORDER = ["/", "/students", "/teachers", "/expenses", "/reports", "/blog", "/settings"];

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
  if (pathname !== currentPath) {
    previousPath = currentPath;
    currentPath = pathname;
  }
  const direction = rank(pathname) < rank(previousPath) ? "back" : "forward";

  return (
    <div key={pathname} className="page-slide" data-direction={direction}>
      {children}
    </div>
  );
}

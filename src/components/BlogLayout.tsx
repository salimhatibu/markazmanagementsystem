import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { formatEatLongDate } from "../../shared/format";
import { useAuth } from "../lib/auth";
import { BlogBrandMark } from "../lib/blog-brand";
import "../blog-pen.css";

const desk = [
  { to: "/blog", label: "Desk", end: true, step: 1 },
  { to: "/blog/posts", label: "The posts", end: false, step: 2 },
  { to: "/blog/write", label: "Write", end: false, step: 3 },
  { to: "/blog/analytics", label: "Analytics", end: false, step: 4 },
  { to: "/blog/series", label: "Series", end: false, step: 5 },
];

function currentStep(path: string): number {
  if (path.startsWith("/blog/series")) return 5;
  if (path.startsWith("/blog/analytics")) return 4;
  if (path.startsWith("/blog/write")) return 3;
  if (path.startsWith("/blog/posts")) return 2;
  if (/^\/blog\/[^/]+$/.test(path) && path !== "/blog") return 2;
  return 1;
}

export function BlogLayout() {
  const { pathname } = useLocation();
  const auth = useAuth();
  const step = currentStep(pathname);

  useEffect(() => {
    document.documentElement.dataset.surface = "blog";
    const previous = document.title;
    document.title = "The سلفية mindset";
    return () => {
      delete document.documentElement.dataset.surface;
      document.title = previous;
    };
  }, []);

  return (
    <div className="blog-pen" lang="en-GB">
      <main>
        <header className="masthead">
          <Link to="/blog">
            <BlogBrandMark />
          </Link>
          <span>
            Words / {formatEatLongDate(new Date())}
            {auth.identityOn ? (
              <>
                {" · "}
                <button type="button" className="reset" onClick={() => void auth.signOut()}>
                  Sign out
                </button>
              </>
            ) : null}
          </span>
        </header>
        <nav className="flow-guide" aria-label="Blog desk">
          {desk.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={() => {
                const on =
                  item.step === step ||
                  (item.to === "/blog/write" && pathname.startsWith("/blog/write"));
                if (item.step < step) return "complete";
                return on ? "active" : undefined;
              }}
            >
              <b>0{item.step}</b>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <Outlet />
        <footer>
          <span>Sponsored by maktabahruhayn.com · Design by Abu Ruhayn</span>
          <span>
            Owner Meemy · <BlogBrandMark /> · Mombasa, Kenya
          </span>
        </footer>
      </main>
    </div>
  );
}

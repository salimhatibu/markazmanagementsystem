import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { formatEatLongDate } from "../../shared/format";
import { BlogBrandMark } from "../lib/blog-brand";
import "../blog-pen.css";

export function PublicBlogLayout() {
  const { pathname } = useLocation();

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
    <div className="blog-pen blog-pen--public" lang="en-GB">
      <main>
        <header className="masthead">
          <Link to="/read">
            <BlogBrandMark />
          </Link>
          <span>A public paper / {formatEatLongDate(new Date())}</span>
        </header>
        <nav className="flow-guide" aria-label="Public papers">
          <NavLink to="/read" end className={({ isActive }) => (isActive ? "active" : undefined)}>
            <b>01</b>
            The papers
          </NavLink>
          <span className={pathname.startsWith("/read/") && pathname !== "/read" ? "active" : undefined}>
            <b>02</b>
            The piece
          </span>
        </nav>
        <Outlet />
        <footer>
          <span>Sponsored by maktabahruhayn.com · Design by Abu Ruhayn</span>
        </footer>
      </main>
    </div>
  );
}

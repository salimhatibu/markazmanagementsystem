import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useParams } from "react-router-dom";
import { formatEatLongDate, hijriDate } from "../../shared/format";
import { NewsletterPrompt, newsletterPromptDue } from "./NewsletterPrompt";
import { BlogBrandMark } from "../lib/blog-brand";
import { publicSavedPath, publicSeriesPath, publicShelfPath } from "../lib/blog-share";
import { paperIssueNumber } from "../lib/paper-almanac";
import { api } from "../lib/api";
import type { BlogPost, BlogSeries } from "../types";
import "../blog-pen.css";

const PaperIssueContext = createContext<number | null>(null);

export function usePaperIssue() {
  return useContext(PaperIssueContext);
}

function pieceSlugFromPath(pathname: string, paramSlug?: string): string | undefined {
  if (paramSlug) return paramSlug;
  if (pathname.startsWith("/read/series/") || pathname.startsWith("/series/")) return undefined;
  if (pathname === "/read/saved" || pathname === "/saved") return undefined;
  if (pathname.startsWith("/read/")) {
    const rest = pathname.slice("/read/".length);
    return rest && !rest.includes("/") ? rest : undefined;
  }
  if (pathname.length > 1 && !pathname.slice(1).includes("/")) return pathname.slice(1);
  return undefined;
}

export function PublicBlogLayout() {
  const { pathname } = useLocation();
  const { slug: paramSlug } = useParams();
  const slug = pieceSlugFromPath(pathname, paramSlug);
  const shelf = publicShelfPath();
  const today = new Date();
  const hijri = hijriDate(today);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [series, setSeries] = useState<BlogSeries[]>([]);
  const [navOpen, setNavOpen] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const closeLetter = useCallback(() => setLetterOpen(false), []);
  const onSaved = pathname === publicSavedPath();
  const onSeries = pathname.startsWith("/read/series/") || pathname.startsWith("/series/");
  const onShelf = pathname === shelf || pathname === "/read" || pathname === "/";
  const onPiece = Boolean(slug) && !onSaved && !onSeries;
  const issue = paperIssueNumber(posts, onPiece ? slug : undefined);

  useEffect(() => {
    document.documentElement.dataset.surface = "blog";
    const previous = document.title;
    document.title = "The سلفية mindset";
    return () => {
      delete document.documentElement.dataset.surface;
      document.title = previous;
    };
  }, []);

  useEffect(() => {
    api<{ posts: BlogPost[] }>("/api/posts")
      .then((body) => setPosts(body.posts))
      .catch(() => setPosts([]));
    api<{ series: BlogSeries[] }>("/api/series")
      .then((body) => setSeries(body.series))
      .catch(() => setSeries([]));
  }, []);

  useEffect(() => {
    if (!onShelf || !newsletterPromptDue()) return;
    const timer = window.setTimeout(() => setLetterOpen(true), 700);
    return () => window.clearTimeout(timer);
  }, [pathname, onShelf]);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  return (
    <PaperIssueContext.Provider value={issue}>
      <div className="blog-pen blog-pen--public" lang="en-GB">
        <main className="paper-sheet">
          <header className="paper-masthead">
            <div className="paper-kicker-row">
              <time dateTime={today.toISOString()}>{formatEatLongDate(today)}</time>
              <span>From my pen, to your mind</span>
            </div>
            <h1 className="paper-name">
              <Link to={shelf}>
                <BlogBrandMark />
              </Link>
            </h1>
            <p className="paper-tag">Your daily dose of salafiyyah</p>
            <div className="paper-rule-heavy" />
            <div className="paper-issue-row">
              <span>{issue != null ? `Issue No. ${issue}` : "Issue No. —"}</span>
              <span>{hijri.english}</span>
            </div>
          </header>
          <button
            type="button"
            className="paper-nav-toggle"
            aria-expanded={navOpen}
            aria-controls="paper-nav"
            onClick={() => setNavOpen((open) => !open)}
          >
            {navOpen ? "Close sections" : "Sections of the paper"}
          </button>
          <nav
            id="paper-nav"
            className={`paper-cats${navOpen ? " is-open" : ""}`}
            aria-label="The paper"
          >
            <NavLink to={shelf} end className={({ isActive }) => (isActive ? "is-active" : undefined)}>
              The papers
            </NavLink>
            <NavLink to={publicSavedPath()} className={({ isActive }) => (isActive ? "is-active" : undefined)}>
              Saved
            </NavLink>
            {series.length ? (
              <details className={`paper-series-menu${onSeries ? " is-active" : ""}`}>
                <summary>Series</summary>
                <div className="paper-series-list">
                  {series.map((item) => (
                    <NavLink
                      key={item.id}
                      to={publicSeriesPath(item.slug)}
                      className={({ isActive }) => (isActive ? "is-active" : undefined)}
                      onClick={() => setNavOpen(false)}
                    >
                      {item.title}
                    </NavLink>
                  ))}
                </div>
              </details>
            ) : null}
            {onPiece ? (
              <a href="#the-piece" className="is-active" onClick={() => setNavOpen(false)}>
                The piece
              </a>
            ) : (
              <span>The piece</span>
            )}
            {onPiece ? (
              <a href="#letters" onClick={() => setNavOpen(false)}>
                Letters
              </a>
            ) : (
              <span>Letters</span>
            )}
          </nav>
          <Outlet />
          <NewsletterPrompt open={letterOpen} onClose={closeLetter} />
          <footer className="paper-colophon">
            <p>
              <BlogBrandMark /> — printed digitally, read slowly
            </p>
            <p>
              Sponsored by{" "}
              <a href="https://maktabahruhayn.com" target="_blank" rel="noreferrer noopener">
                maktabahruhayn.com
              </a>{" "}
              · Design by Abu Ruhayn
            </p>
          </footer>
        </main>
      </div>
    </PaperIssueContext.Provider>
  );
}

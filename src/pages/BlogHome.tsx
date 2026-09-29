import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatEatLongDate } from "../../shared/format";
import { api } from "../lib/api";
import { padCount } from "../lib/blog-stats";
import { publicShelfUrl, shareUrl } from "../lib/blog-share";
import type { BlogPost } from "../types";

export function BlogHomePage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [drafts, setDrafts] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api<{ posts: BlogPost[] }>("/api/posts?all=1")
      .then((body) => {
        setPosts(body.posts.filter((post) => post.published));
        setDrafts(body.posts.filter((post) => !post.published).length);
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "The desk could not be opened.");
      });
  }, []);

  const latest = posts[0];

  async function copyPublic() {
    setNotice("");
    try {
      const result = await shareUrl("The سلفية mindset", publicShelfUrl());
      setNotice(result === "copied" ? "The public page link is on the clipboard." : "Ready to pass on.");
    } catch {
      setNotice("The public link could not be copied just then.");
    }
  }

  return (
    <>
      <section className="intro">
        <h1>
          The
          <br />
          <span lang="ar" className="blog-arabic">
            سلفية
          </span>
          <span> mindset.</span>
        </h1>
        <div className="intro-note">
          <div className="issue">VOL. {padCount(posts.length)}</div>
          <p>Write, post, and watch how the notes are read.</p>
        </div>
      </section>
      <section className="brief" aria-label="This desk">
        <div>
          <span className="eyebrow">On the public shelf</span>
          <strong>{posts.length ? `${posts.length} posted` : "No public posts yet"}</strong>
        </div>
        <div className="estimate">
          <span className="eyebrow">Still in the drawer</span>
          <strong>{drafts ? `${drafts} draft${drafts === 1 ? "" : "s"}` : "Drawer empty"}</strong>
        </div>
        <Link className="sample" to="/blog/write">
          Write a post ↗
        </Link>
      </section>
      {error ? <p className="status">{error}</p> : null}
      {notice ? <p className="status">{notice}</p> : null}
      <section className="choices" aria-labelledby="desk-title">
        <div className="choices-header">
          <div>
            <span className="eyebrow">Your first decision</span>
            <h2 id="desk-title">Open a drawer—or do the writing.</h2>
          </div>
          <p>The desk has three rooms: the posts, a blank page, and the numbers.</p>
        </div>
        <div className="menu" aria-label="Blog rooms">
          <Link className="quest" to="/blog/posts">
            <span className="cost">
              <span>01</span>
              <span>READ ↗</span>
            </span>
            <b>The written blogs</b>
            <span className="excuse">Every public note, in the order it was posted.</span>
          </Link>
          <Link className="quest" to="/blog/write">
            <span className="cost">
              <span>02</span>
              <span>COMPOSE ↗</span>
            </span>
            <b>Create a post</b>
            <span className="excuse">Pictures, video, headings, then post it publicly.</span>
          </Link>
          <Link className="quest" to="/blog/analytics">
            <span className="cost">
              <span>03</span>
              <span>MEASURE ↗</span>
            </span>
            <b>Analytics</b>
            <span className="excuse">Views, time on the page, click-through, bounce.</span>
          </Link>
        </div>
        <div className="actions">
          <Link className="random" to="/read">
            Open the public page ↗
          </Link>
          <button type="button" className="random" onClick={() => void copyPublic()}>
            Copy the public link
          </button>
        </div>
        <p className="status">
          {latest
            ? `Latest public note: ${latest.title}, ${formatEatLongDate(new Date(latest.publishedAt ?? latest.createdAt))}.`
            : "Start here: write a post, or open the empty shelf."}
        </p>
      </section>
    </>
  );
}

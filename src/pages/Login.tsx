import { ReactNode, useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { MARKAZ_NAME } from "../../shared/format";
import { KineticText } from "../components/KineticText";
import { useAuth } from "../lib/auth";
import { publicShelfHref } from "../lib/surface";
import "../login-gate.css";

const PARTICLES = Array.from({ length: 18 }, (_, index) => ({
  left: `${(index * 53) % 100}%`,
  bottom: `${6 + (index % 6) * 8}%`,
  delay: `${(index * 0.65) % 9}s`,
  duration: `${9 + (index % 6)}s`,
}));

const MARQUEE = ["Keepers", "◆", "Public papers", "◆", "Cloudflare Access", "◆", "Open the desk", "◆"];

function GateFrame({ children }: { children: ReactNode }) {
  return (
    <div className="gate">
      <header className="gate-nav">
        <a className="gate-logo" href={publicShelfHref()}>
          {MARKAZ_NAME}<sup>®</sup>
        </a>
        <a className="gate-nav-link" href={publicShelfHref()}>
          Read the papers
        </a>
      </header>
      <div className="gate-stage">
        <div className="gate-particles" aria-hidden="true">
          {PARTICLES.map((particle) => (
            <span
              key={`${particle.left}-${particle.delay}`}
              className="gate-particle"
              style={{
                left: particle.left,
                bottom: particle.bottom,
                animationDelay: particle.delay,
                animationDuration: particle.duration,
              }}
            />
          ))}
        </div>
        <div className="gate-glow" aria-hidden="true" />
        <div className="gate-ring" aria-hidden="true" />
        <div className="gate-ring-2" aria-hidden="true" />
        {children}
      </div>
      <div className="gate-marquee" aria-hidden="true">
        <div className="gate-marquee-track">
          {[...MARQUEE, ...MARQUEE].map((word, index) => (
            <span key={index} className={word === "◆" ? "is-pink" : undefined}>
              {word}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const auth = useAuth();
  const location = useLocation();
  const from =
    typeof location.state === "object" && location.state && "from" in location.state
      ? String((location.state as { from?: string }).from || "/")
      : "/";
  const safeFrom =
    /^\/(?![/\\])/.test(from) && !from.startsWith("/read") && from !== "/login" ? from : "/";
  const [error, setError] = useState("");

  useEffect(() => {
    if (auth.bootError) setError(auth.bootError);
  }, [auth.bootError]);

  if (!auth.ready) {
    return (
      <div className="gate">
        <div className="gate-stage">
          <p className="gate-lede">Opening the gate…</p>
        </div>
      </div>
    );
  }

  if (!auth.accessOn) {
    return (
      <GateFrame>
        <p className="gate-kicker">Local desk</p>
        <h1 className="gate-title">
          <KineticText text="Access is off." />
        </h1>
        <p className="gate-lede">
          This is the local desk. On the hosted site, Cloudflare Access signs keepers in with an allowed email.
        </p>
        <div className="gate-actions">
          <Link className="gate-nav-link" to="/">
            Open the desk
          </Link>
        </div>
      </GateFrame>
    );
  }

  if (auth.isAdmin && auth.user) {
    return <Navigate to={safeFrom} replace />;
  }

  return (
    <GateFrame>
      <p className="gate-kicker">Keepers</p>
      <h1 className="gate-title">
        <KineticText text="Open the desk." />
      </h1>
      <p className="gate-lede">
        Sign in with Cloudflare Access using an email on the allow list. Readers can stay with the public papers
        without a desk login.
      </p>
      {error ? <p className="gate-status is-error">{error}</p> : null}
      {!auth.user ? (
        <p className="gate-status">
          If you were not prompted to sign in, open this site again so Access can check your email.
        </p>
      ) : null}
      <div className="gate-actions">
        <a className="gate-submit" href={safeFrom}>
          Continue to the desk
        </a>
        <a className="gate-nav-link" href={publicShelfHref()}>
          Read the papers
        </a>
      </div>
    </GateFrame>
  );
}

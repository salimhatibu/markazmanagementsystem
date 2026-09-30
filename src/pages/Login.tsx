import {
  acceptInvite,
  AuthError,
  login,
  MissingIdentityError,
  oauthLogin,
  requestPasswordRecovery,
  signup,
  updateUser,
} from "@netlify/identity";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { MARKAZ_NAME } from "../../shared/format";
import { useAuth } from "../lib/auth";
import "../login-gate.css";

type Mode = "signin" | "signup" | "recover";

const PARTICLES = Array.from({ length: 18 }, (_, index) => ({
  left: `${(index * 53) % 100}%`,
  bottom: `${6 + (index % 6) * 8}%`,
  delay: `${(index * 0.65) % 9}s`,
  duration: `${9 + (index % 6)}s`,
}));

const MARQUEE = ["Keepers", "◆", "Public papers", "◆", "Sign in", "◆", "Create an account", "◆"];

function GateFrame({ children }: { children: ReactNode }) {
  return (
    <div className="gate">
      <header className="gate-nav">
        <Link className="gate-logo" to="/read">
          {MARKAZ_NAME}<sup>®</sup>
        </Link>
        <Link className="gate-nav-link" to="/read">
          Read the papers
        </Link>
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

function authErrorMessage(error: unknown): string {
  if (error instanceof MissingIdentityError) {
    return "Identity is not enabled on this site yet.";
  }
  if (error instanceof AuthError) {
    if (error.status === 401) return "That email or password was not accepted.";
    if (error.status === 403) return "New accounts are not being taken just now.";
    if (error.status === 422) return error.message || "That password is too weak.";
    return error.message || "That could not be completed.";
  }
  return error instanceof Error ? error.message : "That could not be completed.";
}

function passwordIssue(value: string): string | null {
  if (value.length < 10) return "Use at least 10 characters.";
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return "Use letters and at least one number.";
  return null;
}

export function LoginPage() {
  const auth = useAuth();
  const location = useLocation();
  const from = typeof location.state === "object" && location.state && "from" in location.state
    ? String((location.state as { from?: string }).from || "/")
    : "/";
  // Only ever bounce back to a same-origin desk path. `//host` and `/\host` are
  // both read as protocol-relative URLs by browsers, so reject either shape.
  const safeFrom =
    /^\/(?![/\\])/.test(from) && !from.startsWith("/read") && from !== "/login" ? from : "/";
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

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

  if (!auth.identityOn) {
    return (
      <GateFrame>
        <p className="gate-kicker">Local desk</p>
        <h1 className="gate-title">Identity is <em>off</em>.</h1>
        <p className="gate-lede">
          On a hosted Netlify site, enable Identity, invite the first keeper, and add the <code>admin</code> role.
          Until then the local books stay open so the ledger can be used without a cloud login.
        </p>
        <div className="gate-actions">
          <Link className="gate-nav-link" to="/">
            Open the desk
          </Link>
        </div>
      </GateFrame>
    );
  }

  if (auth.isAdmin && !auth.pending) {
    return <Navigate to={safeFrom} replace />;
  }

  const invite = auth.pending?.type === "invite" ? auth.pending.token : null;
  const recovery = auth.pending?.type === "recovery";
  const waiting = Boolean(auth.user && !auth.isAdmin && !invite && !recovery);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    try {
      if (invite) {
        const issue = passwordIssue(password);
        if (issue) throw new Error(issue);
        if (password !== confirm) throw new Error("The two passwords do not match.");
        await acceptInvite(invite, password);
        auth.clearPending();
        setInfo("The invite is accepted. A keeper still has to add the admin role before the desk opens.");
        return;
      }
      if (recovery) {
        const issue = passwordIssue(password);
        if (issue) throw new Error(issue);
        if (password !== confirm) throw new Error("The two passwords do not match.");
        await updateUser({ password });
        auth.clearPending();
        setInfo("The password is set. Sign in again if the desk does not open.");
        return;
      }
      if (mode === "recover") {
        await requestPasswordRecovery(email.trim());
        setInfo("If that address is on the books, a reset letter is on its way.");
        return;
      }
      if (mode === "signup") {
        const issue = passwordIssue(password);
        if (issue) throw new Error(issue);
        if (password !== confirm) throw new Error("The two passwords do not match.");
        const user = await signup(email.trim(), password, name.trim() ? { full_name: name.trim() } : undefined);
        const confirmed = Boolean(user.confirmedAt);
        setInfo(
          confirmed
            ? "The account is ready. It cannot open the desk until a keeper grants the admin role."
            : "Confirm the address from the email we sent. The desk still stays locked until a keeper grants admin.",
        );
        setMode("signin");
        setPassword("");
        setConfirm("");
        return;
      }
      await login(email.trim(), password);
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  const kicker = invite
    ? "Accept invite"
    : recovery
      ? "New password"
      : mode === "signup"
        ? "Create account"
        : mode === "recover"
          ? "Reset"
          : "Sign in";
  const title = invite ? (
    <>Choose a <em>password</em>.</>
  ) : recovery ? (
    <>Set a new <em>password</em>.</>
  ) : mode === "signup" ? (
    <>Make an <em>account</em>.</>
  ) : mode === "recover" ? (
    <>Send a <em>reset</em>.</>
  ) : (
    <>Open the <em>gate</em>.</>
  );

  return (
    <GateFrame>
      {waiting ? (
        <>
          <p className="gate-kicker">Waiting</p>
          <h1 className="gate-title">Desk still <em>locked</em>.</h1>
          <p className="gate-lede">
            {auth.user?.email} can read the public papers. Ask a keeper to open Project configuration → Identity,
            select this user, and add the role <code>admin</code>.
          </p>
          <div className="gate-actions">
            <button type="button" className="gate-google" onClick={() => void auth.signOut()}>
              Sign out
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="gate-kicker">{kicker}</p>
          <h1 className="gate-title">{title}</h1>
          <p className="gate-lede">
            {mode === "signup"
              ? "The desk stays closed until a keeper grants the admin role."
              : "Keepers sign in here. Readers can stay with the public papers."}
          </p>
          {error ? <p className="gate-status is-error">{error}</p> : null}
          {info ? <p className="gate-status">{info}</p> : null}
          <form className="gate-form" onSubmit={(event) => void onSubmit(event)}>
            {invite || recovery ? null : (
              <label className="gate-field">
                <span>Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
            )}
            {mode !== "recover" || invite || recovery ? (
              <label className="gate-field">
                <span>Password</span>
                <input
                  type="password"
                  autoComplete={mode === "signup" || invite || recovery ? "new-password" : "current-password"}
                  required={mode !== "recover"}
                  minLength={10}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
            ) : null}
            {mode === "signup" || invite || recovery ? (
              <label className="gate-field">
                <span>Confirm password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={10}
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                />
              </label>
            ) : null}
            {mode === "signup" && !invite && !recovery ? (
              <label className="gate-field">
                <span>Name, optional</span>
                <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />
              </label>
            ) : null}
            <button type="submit" className="gate-submit" disabled={busy}>
              {busy
                ? "Please wait…"
                : invite
                  ? "Accept invite"
                  : recovery
                    ? "Save password"
                    : mode === "signup"
                      ? "Create account"
                      : mode === "recover"
                        ? "Send reset"
                        : "Sign in"}
            </button>
            {auth.googleOn && !invite && !recovery && mode !== "recover" ? (
              <button type="button" className="gate-google" onClick={() => oauthLogin("google")}>
                Continue with Google
              </button>
            ) : null}
          </form>
          {invite || recovery ? null : (
            <p className="gate-switch">
              {mode === "signin" ? (
                <>
                  <button type="button" onClick={() => setMode("signup")}>
                    Create an account
                  </button>
                  <button type="button" onClick={() => setMode("recover")}>
                    Forgotten password
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setMode("signin")}>
                  Back to sign in
                </button>
              )}
            </p>
          )}
        </>
      )}
    </GateFrame>
  );
}

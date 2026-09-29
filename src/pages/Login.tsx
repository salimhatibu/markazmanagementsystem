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
import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { MARKAZ_NAME } from "../../shared/format";
import { useAuth } from "../lib/auth";

type Mode = "signin" | "signup" | "recover";

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
  const safeFrom = from.startsWith("/read") || from === "/login" ? "/" : from;
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
      <div className="loading">
        <p>Opening the gate…</p>
      </div>
    );
  }

  if (!auth.identityOn) {
    return (
      <main className="blocked">
        <p className="eyebrow">Local desk</p>
        <h1>Identity is not on this machine.</h1>
        <p>
          On a hosted Netlify site, enable Identity, invite the first keeper, and add the <code>admin</code> role.
          Until then the local books stay open so the ledger can be used without a cloud login.
        </p>
        <div className="actions">
          <Link className="solid" to="/">
            Open the desk
          </Link>
          <Link className="ghost" to="/read">
            Public papers
          </Link>
        </div>
      </main>
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

  return (
    <div className="login">
      <section className="login-copy">
        <p className="eyebrow">Markaz keepers</p>
        <h1>{MARKAZ_NAME}</h1>
        <p className="lede">Create an account and sign in here.</p>
      </section>
      <section className="login-panel">
        {waiting ? (
          <>
            <p className="eyebrow">Waiting</p>
            <h2>Signed in, desk still locked.</h2>
            <p>
              {auth.user?.email} can read the public papers. Ask a keeper to open{" "}
              <strong>Project configuration → Identity</strong>, select this user, and add the role{" "}
              <code>admin</code>.
            </p>
            <div className="actions">
              <Link className="ghost" to="/read">
                Public papers
              </Link>
              <button type="button" className="ghost" onClick={() => void auth.signOut()}>
                Sign out
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="eyebrow">
              {invite ? "Accept invite" : recovery ? "New password" : mode === "signup" ? "Create account" : mode === "recover" ? "Reset" : "Sign in"}
            </p>
            <h2>
              {invite
                ? "Choose a password for the invite."
                : recovery
                  ? "Set a new password."
                  : mode === "signup"
                    ? "Make an account."
                    : mode === "recover"
                      ? "Send a reset letter."
                      : "Open the gate."}
            </h2>
            {error ? <p className="status">{error}</p> : null}
            {info ? <p className="status">{info}</p> : null}
            <form onSubmit={(event) => void onSubmit(event)}>
              {invite || recovery ? null : (
                <label className="field">
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
                <label className="field">
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
                <label className="field">
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
                <label className="field">
                  <span>Name, optional</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />
                </label>
              ) : null}
              <button type="submit" className="solid" disabled={busy}>
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
            </form>
            {auth.googleOn && !invite && !recovery && mode !== "recover" ? (
              <button type="button" className="ghost" onClick={() => oauthLogin("google")}>
                Continue with Google
              </button>
            ) : null}
            {invite || recovery ? null : (
              <p>
                {mode === "signin" ? (
                  <>
                    <button type="button" className="linkish" onClick={() => setMode("signup")}>
                      Create an account
                    </button>
                    {" · "}
                    <button type="button" className="linkish" onClick={() => setMode("recover")}>
                      Forgotten password
                    </button>
                  </>
                ) : (
                  <button type="button" className="linkish" onClick={() => setMode("signin")}>
                    Back to sign in
                  </button>
                )}
              </p>
            )}
            <p>
              <Link to="/read">Leave the gate and read the public papers</Link>
            </p>
          </>
        )}
      </section>
    </div>
  );
}

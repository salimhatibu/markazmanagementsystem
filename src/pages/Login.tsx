import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { authMessage, useAuth } from "../auth/AuthProvider";
import { Field, Notice } from "../components/ui";

export function LoginPage() {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"sign-in" | "sign-up" | "forgot">("sign-in");

  if (auth.ready && auth.user && !auth.recovery) {
    return <Navigate to="/" replace />;
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setInfo("");
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : authMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  function onLogin(event: FormEvent) {
    event.preventDefault();
    void run(() => auth.signIn(email, password));
  }

  function onSignUp(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      const result = await auth.signUp(email, password);
      if (result === "confirm") {
        setInfo("Account created. Check that inbox to confirm it, then sign in.");
        setMode("sign-in");
        setPassword("");
      }
    });
  }

  function onInvite(event: FormEvent) {
    event.preventDefault();
    void run(() => auth.accept(password));
  }

  function onRecovery(event: FormEvent) {
    event.preventDefault();
    void run(() => auth.resetPassword(password));
  }

  function onForgot(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      await auth.sendRecovery(email);
      setInfo("Check that inbox for a recovery link.");
    });
  }

  let form = (
    <form onSubmit={onLogin}>
      <Field id="email" label="Email">
        <input id="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
      </Field>
      <Field id="password" label="Password">
        <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
      </Field>
      <button className="solid" type="submit" disabled={busy}>Sign in</button>
      <button className="linkish" type="button" onClick={() => { setMode("sign-up"); setError(""); setInfo(""); }}>Create an account</button>
      <button className="linkish" type="button" onClick={() => setMode("forgot")}>Forgot password</button>
    </form>
  );

  if (mode === "sign-up") {
    form = (
      <form onSubmit={onSignUp}>
        <Field id="signup-email" label="Email">
          <input id="signup-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field id="signup-password" label="Password">
          <input id="signup-password" type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        <button className="solid" type="submit" disabled={busy}>Create account</button>
        <button className="linkish" type="button" onClick={() => setMode("sign-in")}>Back to sign in</button>
      </form>
    );
  }

  if (mode === "forgot") {
    form = (
      <form onSubmit={onForgot}>
        <Field id="recovery-email" label="Email">
          <input id="recovery-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <button className="solid" type="submit" disabled={busy}>Send recovery link</button>
        <button className="linkish" type="button" onClick={() => setMode("sign-in")}>Back to sign in</button>
      </form>
    );
  }

  if (auth.inviteToken) {
    form = (
      <form onSubmit={onInvite}>
        <p>Set a password to finish creating this account.</p>
        <Field id="invite-password" label="Password">
          <input id="invite-password" type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        <button className="solid" type="submit" disabled={busy}>Accept invite</button>
      </form>
    );
  }

  if (auth.recovery) {
    form = (
      <form onSubmit={onRecovery}>
        <p>Choose a new password for this account.</p>
        <Field id="new-password" label="New password">
          <input id="new-password" type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        <button className="solid" type="submit" disabled={busy}>Update password</button>
      </form>
    );
  }

  return (
    <main className="login">
      <section className="login-copy">
        <p className="micro">&gt; Account</p>
        <h1>{mode === "sign-up" ? "Create account" : "Sign in"}</h1>
        <p className="lede">Anyone can register an account and sign in to open the ledger.</p>
      </section>
      <section className="login-panel" aria-labelledby="login-title">
        <p className="micro">&gt; Account</p>
        <h2 id="login-title">{mode === "sign-up" ? "Register" : "Sign in"}</h2>
        {error ? <Notice>{error}</Notice> : null}
        {info ? <Notice tone="ok">{info}</Notice> : null}
        {!auth.ready ? <p className="micro">&gt; Loading</p> : form}
      </section>
    </main>
  );
}

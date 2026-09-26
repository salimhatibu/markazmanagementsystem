import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { hasAdminRole } from "../../shared/auth";
import { authMessage, useAuth } from "../auth/AuthProvider";
import { Field, Notice } from "../components/ui";

export function LoginPage() {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);

  if (auth.ready && auth.user && hasAdminRole(auth.user) && !auth.recovery) {
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
      <button className="linkish" type="button" onClick={() => setForgot(true)}>Forgot password</button>
    </form>
  );

  if (forgot) {
    form = (
      <form onSubmit={onForgot}>
        <Field id="recovery-email" label="Email">
          <input id="recovery-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <button className="solid" type="submit" disabled={busy}>Send recovery link</button>
        <button className="linkish" type="button" onClick={() => setForgot(false)}>Back to sign in</button>
      </form>
    );
  }

  if (auth.inviteToken) {
    form = (
      <form onSubmit={onInvite}>
        <p>Set a password to accept the admin invite.</p>
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
        <p>Choose a new password for this admin account.</p>
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
        <p className="micro">&gt; Invite only</p>
        <h1>Sign in</h1>
        <p className="lede">Primary admin access. Public signup is closed. An invited account needs the admin role before the ledger opens.</p>
      </section>
      <section className="login-panel" aria-labelledby="login-title">
        <p className="micro">&gt; Account</p>
        <h2 id="login-title">Admin</h2>
        {error ? <Notice>{error}</Notice> : null}
        {info ? <Notice tone="ok">{info}</Notice> : null}
        {!auth.ready ? <p className="micro">&gt; Loading</p> : form}
      </section>
    </main>
  );
}

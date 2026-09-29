import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";

export function AdminGate() {
  const auth = useAuth();
  const location = useLocation();

  if (!auth.ready) {
    return (
      <div className="loading">
        <p>Opening the desk…</p>
      </div>
    );
  }

  if (!auth.identityOn) return <Outlet />;
  if (auth.pending?.type === "invite" || auth.pending?.type === "recovery") {
    return <Navigate to="/login" replace />;
  }
  if (!auth.user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!auth.isAdmin) {
    return (
      <main className="blocked">
        <p className="eyebrow">Markaz desk</p>
        <h1>This account cannot open the books.</h1>
        <p>
          You are signed in as {auth.user.email ?? "this address"}, but the admin role has not been granted. Ask a
          keeper to add the <code>admin</code> role in Netlify Identity. The public papers stay open without a desk
          login.
        </p>
        <div className="actions">
          <Link className="ghost" to="/read">
            Read the papers
          </Link>
          <button type="button" className="ghost" onClick={() => void auth.signOut()}>
            Sign out
          </button>
        </div>
      </main>
    );
  }

  return <Outlet />;
}

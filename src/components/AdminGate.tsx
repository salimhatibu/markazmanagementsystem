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

  if (!auth.accessOn) return <Outlet />;

  if (!auth.user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!auth.isAdmin) {
    return (
      <main className="blocked">
        <p className="eyebrow">Markaz desk</p>
        <h1>This account cannot open the books.</h1>
        <p>
          You are signed in as {auth.user.email}, but Cloudflare Access did not admit this session. Ask a keeper to
          add you to the Access policy. The public papers stay open without a desk login.
        </p>
        <div className="actions">
          <Link className="ghost" to="/read">
            Read the papers
          </Link>
          <button type="button" className="ghost" onClick={() => auth.signOut()}>
            Sign out
          </button>
        </div>
      </main>
    );
  }

  return <Outlet />;
}

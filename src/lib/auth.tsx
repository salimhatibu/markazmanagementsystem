import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type DeskUser = {
  email: string;
  name?: string | null;
};

type AuthState = {
  ready: boolean;
  /** When false, the desk is open locally without Cloudflare Access. */
  accessOn: boolean;
  user: DeskUser | null;
  isAdmin: boolean;
  bootError: string;
  signOut: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [accessOn, setAccessOn] = useState(false);
  const [user, setUser] = useState<DeskUser | null>(null);
  const [bootError, setBootError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/session", { credentials: "include" });
        if (cancelled) return;
        if (response.ok) {
          const body = (await response.json()) as {
            openDesk?: boolean;
            email?: string | null;
            name?: string | null;
          };
          if (body.openDesk) {
            setAccessOn(false);
            setUser(body.email ? { email: body.email, name: body.name } : null);
          } else {
            setAccessOn(true);
            setUser(body.email ? { email: body.email, name: body.name } : null);
          }
          setReady(true);
          return;
        }
        if (response.status === 401) {
          setAccessOn(true);
          setUser(null);
          setReady(true);
          return;
        }
        if (response.status === 503) {
          const local = ["localhost", "127.0.0.1"].includes(window.location.hostname);
          setAccessOn(!local);
          setUser(null);
          setReady(true);
          return;
        }
        setBootError("The desk gate could not be checked.");
        setAccessOn(true);
        setUser(null);
      } catch {
        if (cancelled) return;
        const local = ["localhost", "127.0.0.1"].includes(window.location.hostname);
        setAccessOn(!local);
        setUser(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      accessOn,
      user,
      isAdmin: !accessOn || Boolean(user),
      bootError,
      signOut: () => {
        setUser(null);
        if (accessOn) {
          window.location.assign(`/cdn-cgi/access/logout?returnTo=${encodeURIComponent(window.location.origin + "/login")}`);
          return;
        }
        window.location.assign("/login");
      },
    }),
    [accessOn, bootError, ready, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is missing.");
  return value;
}

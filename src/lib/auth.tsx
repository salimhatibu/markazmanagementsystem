import {
  getUser,
  getSettings,
  handleAuthCallback,
  logout,
  onAuthChange,
  type User,
} from "@netlify/identity";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { hasAdminRole } from "../../shared/roles";

export type PendingAuth = { type: "invite"; token: string } | { type: "recovery" } | null;

type AuthState = {
  ready: boolean;
  identityOn: boolean;
  googleOn: boolean;
  user: User | null;
  isAdmin: boolean;
  pending: PendingAuth;
  bootError: string;
  clearPending: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function userIsAdmin(user: User | null): boolean {
  if (!user) return false;
  return hasAdminRole(user.roles, user.appMetadata);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [identityOn, setIdentityOn] = useState(false);
  const [googleOn, setGoogleOn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [pending, setPending] = useState<PendingAuth>(null);
  const [bootError, setBootError] = useState("");

  useEffect(() => {
    let unsubscribe: () => void = () => {};
    const hosted = !["localhost", "127.0.0.1"].includes(window.location.hostname);

    void (async () => {
      try {
        const settings = await Promise.race([
          getSettings(),
          new Promise<never>((_, reject) => {
            window.setTimeout(() => reject(new Error("Identity did not answer.")), 5000);
          }),
        ]);
        setIdentityOn(true);
        setGoogleOn(Boolean(settings.providers.google) && hosted);
      } catch {
        setIdentityOn(false);
        setGoogleOn(false);
        setReady(true);
        return;
      }

      try {
        const result = await handleAuthCallback();
        if (result?.type === "invite" && result.token) {
          setPending({ type: "invite", token: result.token });
          navigate("/login", { replace: true });
        } else if (result?.type === "recovery") {
          setPending({ type: "recovery" });
          navigate("/login", { replace: true });
        }
      } catch (caught) {
        setBootError(caught instanceof Error ? caught.message : "That sign-in link could not be used.");
        navigate("/login", { replace: true });
      }
      setUser(await getUser());
      setReady(true);
    })();
    unsubscribe = onAuthChange((_event, current) => setUser(current ?? null));
    return () => unsubscribe();
  }, [navigate]);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      identityOn,
      googleOn,
      user,
      isAdmin: userIsAdmin(user),
      pending,
      bootError,
      clearPending: () => {
        setPending(null);
        setBootError("");
      },
      signOut: async () => {
        try {
          await logout();
        } catch {
          setUser(null);
        }
        setUser(null);
        setPending(null);
        window.location.assign("/login");
      },
    }),
    [bootError, googleOn, identityOn, pending, ready, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is missing.");
  return value;
}

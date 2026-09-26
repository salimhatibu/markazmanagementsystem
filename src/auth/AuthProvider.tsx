import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, api } from "../lib/api";

export type Account = { email: string };

type AuthContextValue = {
  user: Account | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<"ready" | "confirm">;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function messageFrom(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong.";
}

export function authMessage(error: unknown): string {
  return messageFrom(error);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Account | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancel = false;
    api<{ user: Account | null }>("/api/auth/me")
      .then((body) => {
        if (!cancel) setUser(body.user);
      })
      .catch(() => {
        if (!cancel) setUser(null);
      })
      .finally(() => {
        if (!cancel) setReady(true);
      });
    return () => {
      cancel = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      async signIn(email, password) {
        try {
          const body = await api<{ user: Account }>("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
          });
          setUser(body.user);
        } catch (error) {
          throw new Error(messageFrom(error));
        }
      },
      async signUp(email, password) {
        try {
          const body = await api<{ user: Account }>("/api/auth/register", {
            method: "POST",
            body: JSON.stringify({ email, password }),
          });
          setUser(body.user);
          return "ready";
        } catch (error) {
          throw new Error(messageFrom(error));
        }
      },
      async signOut() {
        try {
          await api("/api/auth/logout", { method: "POST" });
        } finally {
          setUser(null);
        }
      },
    }),
    [user, ready],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is missing.");
  return value;
}

import {
  acceptInvite,
  AuthError,
  getUser,
  handleAuthCallback,
  login,
  logout,
  MissingIdentityError,
  requestPasswordRecovery,
  updateUser,
  type User,
} from "@netlify/identity";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  inviteToken: string | null;
  recovery: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  accept: (password: string) => Promise<void>;
  resetPassword: (password: string) => Promise<void>;
  sendRecovery: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function messageFrom(error: unknown): string {
  const missing =
    error instanceof MissingIdentityError ||
    (error instanceof AuthError &&
      (error.status === 404 || /not found/i.test(error.message)));
  if (missing) {
    return "Identity is not available in this environment. Enable it on the deployed Netlify site, then sign in there.";
  }
  if (error instanceof AuthError) {
    if (error.status === 401) return "Email or password is not valid.";
    return error.message;
  }
  return "Something went wrong.";
}

export function authMessage(error: unknown): string {
  return messageFrom(error);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const result = await handleAuthCallback();
        if (cancel) return;
        if (result?.type === "invite" && result.token) {
          setInviteToken(result.token);
          setUser(null);
          return;
        }
        if (result?.type === "recovery") {
          setRecovery(true);
          setUser(result.user);
          return;
        }
        setUser(result?.user ?? (await getUser()));
      } catch {
        if (!cancel) setUser(await getUser());
      } finally {
        if (!cancel) setReady(true);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      inviteToken,
      recovery,
      async signIn(email, password) {
        try {
          setUser(await login(email, password));
        } catch (error) {
          throw new Error(messageFrom(error));
        }
      },
      async signOut() {
        await logout();
        setUser(null);
        setRecovery(false);
      },
      async accept(password) {
        if (!inviteToken) throw new Error("Invite token is missing.");
        try {
          setUser(await acceptInvite(inviteToken, password));
          setInviteToken(null);
        } catch (error) {
          throw new Error(messageFrom(error));
        }
      },
      async resetPassword(password) {
        try {
          setUser(await updateUser({ password }));
          setRecovery(false);
        } catch (error) {
          throw new Error(messageFrom(error));
        }
      },
      async sendRecovery(email) {
        try {
          await requestPasswordRecovery(email);
        } catch (error) {
          throw new Error(messageFrom(error));
        }
      },
    }),
    [user, ready, inviteToken, recovery],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is missing.");
  return value;
}

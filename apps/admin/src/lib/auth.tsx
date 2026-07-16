"use client";

import { redirect } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { AuthUser } from "@harbor/shared";
import {
  getServerSessionSnapshot,
  getSessionSnapshot,
  hydrateSession,
  loginRequest,
  logoutRequest,
  setSession,
  subscribeSession,
} from "./api";

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const session = useSyncExternalStore(
    subscribeSession,
    getSessionSnapshot,
    getServerSessionSnapshot
  );

  useEffect(() => {
    void hydrateSession().finally(() => setHydrated(true));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await loginRequest(email, password);
    if (res.user.role !== "platform_admin") {
      await logoutRequest();
      throw new Error("Admin access required");
    }
    setSession(res.accessToken, res.user);
  }, []);

  const logout = useCallback(() => {
    void logoutRequest();
  }, []);

  const value = useMemo(
    () => ({
      user: session.user,
      token: session.token,
      isLoading: !hydrated,
      login,
      logout,
    }),
    [session.user, session.token, hydrated, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useRequireAuth() {
  const auth = useAuth();
  if (!auth.isLoading && !auth.user) {
    redirect("/login");
  }
  return auth;
}

"use client";

import { redirect } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { AuthUser } from "@harbor/shared";
import {
  clearSession,
  getServerSessionSnapshot,
  getSessionSnapshot,
  loginRequest,
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

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const isClient = useIsClient();
  const session = useSyncExternalStore(
    subscribeSession,
    getSessionSnapshot,
    getServerSessionSnapshot
  );

  const login = useCallback(async (email: string, password: string) => {
    const res = await loginRequest(email, password);
    if (res.user.role === "platform_admin") {
      throw new Error("Use the admin portal for platform accounts");
    }
    if (!res.user.merchantId) {
      throw new Error("Merchant account required");
    }
    setSession(res.accessToken, res.user);
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, []);

  const value = useMemo(
    () => ({
      user: session.user,
      token: session.token,
      isLoading: !isClient,
      login,
      logout,
    }),
    [session.user, session.token, isClient, login, logout]
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

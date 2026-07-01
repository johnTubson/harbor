import type { AuthUser, LoginResponse } from "@harbor/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const TOKEN_KEY = "harbor_admin_token";
const USER_KEY = "harbor_admin_user";

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  emitSessionChange();
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  emitSessionChange();
}

const sessionListeners = new Set<() => void>();

function emitSessionChange() {
  cachedSnapshot = null;
  sessionListeners.forEach((listener) => listener());
}

export type SessionSnapshot = {
  token: string | null;
  user: AuthUser | null;
};

const emptySession: SessionSnapshot = { token: null, user: null };

let cachedSnapshot: SessionSnapshot | null = null;
let cachedToken: string | null | undefined;
let cachedUserRaw: string | null | undefined;

export function getSessionSnapshot(): SessionSnapshot {
  const token = getToken();
  const userRaw =
    typeof window === "undefined" ? null : localStorage.getItem(USER_KEY);

  if (
    cachedSnapshot !== null &&
    cachedToken === token &&
    cachedUserRaw === userRaw
  ) {
    return cachedSnapshot;
  }

  cachedToken = token;
  cachedUserRaw = userRaw;
  cachedSnapshot = { token, user: getStoredUser() };
  return cachedSnapshot;
}

export function getServerSessionSnapshot(): SessionSnapshot {
  return emptySession;
}

export function subscribeSession(onStoreChange: () => void) {
  sessionListeners.add(onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    sessionListeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token = getToken(), ...init } = options;
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message =
      typeof body?.message === "string"
        ? body.message
        : Array.isArray(body?.message)
        ? body.message.join(", ")
        : res.statusText;
    throw new ApiError(res.status, message, body);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function loginRequest(
  email: string,
  password: string
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    token: null,
  });
}

import type { AuthUser, LoginResponse } from "@harbor/shared";

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

type SessionSnapshot = {
  token: string | null;
  user: AuthUser | null;
};

const emptySession: SessionSnapshot = { token: null, user: null };

let sessionSnapshot: SessionSnapshot = emptySession;
let hydratePromise: Promise<void> | null = null;
const sessionListeners = new Set<() => void>();

function emitSessionChange() {
  sessionListeners.forEach((listener) => listener());
}

export function getToken(): string | null {
  return sessionSnapshot.token;
}

export function getStoredUser(): AuthUser | null {
  return sessionSnapshot.user;
}

export function setSession(token: string, user: AuthUser) {
  if (sessionSnapshot.token === token && sessionSnapshot.user === user) {
    return;
  }
  sessionSnapshot = { token, user };
  emitSessionChange();
}

export function clearSession() {
  if (sessionSnapshot === emptySession) return;
  sessionSnapshot = emptySession;
  emitSessionChange();
}

export function getSessionSnapshot(): SessionSnapshot {
  return sessionSnapshot;
}

export function getServerSessionSnapshot(): SessionSnapshot {
  return emptySession;
}

export function subscribeSession(onStoreChange: () => void) {
  sessionListeners.add(onStoreChange);
  return () => {
    sessionListeners.delete(onStoreChange);
  };
}

async function parseError(res: Response): Promise<ApiError> {
  const body = await res.json().catch(() => null);
  const message =
    typeof body?.message === "string"
      ? body.message
      : Array.isArray(body?.message)
      ? body.message.join(", ")
      : res.statusText;
  return new ApiError(res.status, message, body);
}

export async function hydrateSession(): Promise<void> {
  if (sessionSnapshot.token) return;
  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      clearSession();
      return;
    }
    const data = (await res.json()) as { accessToken: string; user: AuthUser };
    setSession(data.accessToken, data.user);
  })().finally(() => {
    hydratePromise = null;
  });

  return hydratePromise;
}

async function refreshAccessToken(): Promise<boolean> {
  const res = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    clearSession();
    return false;
  }
  const data = (await res.json()) as { accessToken: string; user: AuthUser };
  setSession(data.accessToken, data.user);
  return true;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null; skipAuthRetry?: boolean } = {}
): Promise<T> {
  const { token = getToken(), skipAuthRetry, ...init } = options;
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const res = await fetch(`${apiUrl}${path}`, { ...init, headers });

  if (res.status === 401 && !skipAuthRetry && path !== "/auth/login") {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiFetch<T>(path, { ...options, skipAuthRetry: true });
    }
  }

  if (!res.ok) {
    throw await parseError(res);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function loginRequest(
  email: string,
  password: string
): Promise<Pick<LoginResponse, "accessToken" | "user">> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw await parseError(res);
  }
  return res.json() as Promise<Pick<LoginResponse, "accessToken" | "user">>;
}

export async function logoutRequest(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  }).catch(() => undefined);
  clearSession();
}

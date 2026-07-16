import { NextResponse } from "next/server";

export const REFRESH_COOKIE = "harbor_admin_refresh";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function apiBaseUrl(): string {
  return API_URL;
}

export function setRefreshCookie(response: NextResponse, refreshToken: string) {
  response.cookies.set({
    name: REFRESH_COOKIE,
    value: refreshToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearRefreshCookie(response: NextResponse) {
  response.cookies.set({
    name: REFRESH_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function forwardAuth(
  path: string,
  body: unknown,
  headers?: HeadersInit
): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

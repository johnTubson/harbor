import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  clearRefreshCookie,
  forwardAuth,
  REFRESH_COOKIE,
  setRefreshCookie,
} from "@/lib/auth-cookies";

export async function POST() {
  const jar = await cookies();
  const refreshToken = jar.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const upstream = await forwardAuth("/auth/refresh", { refreshToken });
  const payload = await upstream.json().catch(() => null);

  if (!upstream.ok) {
    const response = NextResponse.json(
      payload ?? { message: upstream.statusText },
      { status: upstream.status }
    );
    clearRefreshCookie(response);
    return response;
  }

  const response = NextResponse.json({
    accessToken: payload.accessToken,
    user: payload.user,
  });
  setRefreshCookie(response, payload.refreshToken);
  return response;
}

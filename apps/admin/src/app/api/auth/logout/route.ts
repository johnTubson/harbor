import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  clearRefreshCookie,
  forwardAuth,
  REFRESH_COOKIE,
} from "@/lib/auth-cookies";

export async function POST() {
  const jar = await cookies();
  const refreshToken = jar.get(REFRESH_COOKIE)?.value;

  if (refreshToken) {
    await forwardAuth("/auth/logout", { refreshToken }).catch(() => undefined);
  }

  const response = NextResponse.json({ ok: true });
  clearRefreshCookie(response);
  return response;
}

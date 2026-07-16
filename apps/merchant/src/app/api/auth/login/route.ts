import { NextResponse } from "next/server";

import {
  forwardAuth,
  setRefreshCookie,
} from "@/lib/auth-cookies";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 });
  }

  const upstream = await forwardAuth("/auth/login", body, {
    "user-agent": request.headers.get("user-agent") ?? "",
  });

  const payload = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    return NextResponse.json(
      payload ?? { message: upstream.statusText },
      { status: upstream.status }
    );
  }

  const response = NextResponse.json({
    accessToken: payload.accessToken,
    user: payload.user,
  });
  setRefreshCookie(response, payload.refreshToken);
  return response;
}

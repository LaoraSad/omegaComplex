import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "session";

type Role = "user" | "admin" | "employee";

async function getRoleFromToken(token: string): Promise<Role | null> {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const role = String(payload.role);

    if (role === "user" || role === "admin" || role === "employee") {
      return role;
    }

    return null;
  } catch {
    return null;
  }
}

function loginRedirect(req: NextRequest) {
  const url = new URL("/login", req.url);
  const next = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return loginRedirect(req);
  }

  const role = await getRoleFromToken(token);

  if (!role) {
    return loginRedirect(req);
  }

  if (pathname.startsWith("/dashboard") && role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (
    pathname.startsWith("/validar") &&
    role !== "admin" &&
    role !== "employee"
  ) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // /reservas exige solo sesión válida (cualquier rol).
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/reservas/:path*", "/validar/:path*"],
};

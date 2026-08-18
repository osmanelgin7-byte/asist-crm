import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { canAccessPath } from "@/lib/app-tabs";
import type { Role } from "@/lib/permissions";
import type { AppTabId } from "@/lib/app-tabs";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname.startsWith("/login");
  const isApiAuth = pathname.startsWith("/api/auth");
  const isPublic = isAuthPage || isApiAuth;

  if (!isLoggedIn && !isPublic) {
    if (pathname.startsWith("/api/") && !isApiAuth) {
      return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  if (isLoggedIn && !pathname.startsWith("/api")) {
    const role = req.auth?.user?.role as Role | undefined;
    const allowedTabs = (req.auth?.user?.allowedTabs as AppTabId[] | null) ?? null;

    if (role && !canAccessPath(pathname, role, allowedTabs)) {
      return NextResponse.redirect(new URL("/", req.nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

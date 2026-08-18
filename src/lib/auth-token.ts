import { SignJWT } from "jose";
import type { AppTabId } from "@/lib/app-tabs";
import type { Role } from "@/lib/permissions";

export interface AuthTokenUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  allowedTabs: AppTabId[] | null;
}

function getJwtSecretKey() {
  const secret = process.env.JWT_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("JWT_SECRET veya AUTH_SECRET tanımlı olmalı");
  }
  return new TextEncoder().encode(secret);
}

export async function signAuthToken(user: AuthTokenUser, extra?: { isFirstLogin?: boolean }) {
  return new SignJWT({
    name: user.name,
    email: user.email,
    role: user.role,
    allowedTabs: user.allowedTabs,
    isFirstLogin: extra?.isFirstLogin ?? false,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecretKey());
}

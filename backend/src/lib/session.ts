import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { canAccessTab, sessionHasPermission, type AppTabId } from "@asistcrm/lib/app-tabs";
import type { Permission, Role } from "@asistcrm/lib/permissions";
import { signAuthToken as signToken, type AuthTokenUser } from "@asistcrm/lib/auth-token";

export type { AuthTokenUser as AuthUser };
export { signToken as signAuthToken };

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenUser;
    }
  }
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("JWT_SECRET veya AUTH_SECRET tanımlı olmalı");
  }
  return secret;
}

export function verifyAuthToken(token: string): AuthTokenUser | null {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as jwt.JwtPayload;
    if (!payload.sub || typeof payload.sub !== "string") return null;

    return {
      id: payload.sub,
      name: String(payload.name ?? ""),
      email: String(payload.email ?? ""),
      role: payload.role as Role,
      allowedTabs: (payload.allowedTabs as AppTabId[] | null) ?? null,
    };
  } catch {
    return null;
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token =
    header?.startsWith("Bearer ") ? header.slice(7) : (req.cookies?.token as string | undefined);

  if (!token) {
    res.status(401).json({ error: "Oturum gerekli" });
    return;
  }

  const user = verifyAuthToken(token);
  if (!user) {
    res.status(401).json({ error: "Geçersiz oturum" });
    return;
  }

  req.user = user;
  next();
}

export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (token) {
    const user = verifyAuthToken(token);
    if (user) req.user = user;
  }
  next();
}

export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Oturum gerekli" });
      return;
    }

    const allowed = sessionHasPermission(req.user.role, req.user.allowedTabs, permission);
    if (!allowed) {
      res.status(403).json({ error: "Bu işlem için yetkiniz yok" });
      return;
    }

    next();
  };
}

export function requireTabAccess(tabId: AppTabId, permission?: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Oturum gerekli" });
      return;
    }

    if (!canAccessTab(req.user.role, req.user.allowedTabs, tabId)) {
      res.status(403).json({ error: "Bu işlem için yetkiniz yok" });
      return;
    }

    if (permission && !sessionHasPermission(req.user.role, req.user.allowedTabs, permission)) {
      res.status(403).json({ error: "Bu işlem için yetkiniz yok" });
      return;
    }

    next();
  };
}

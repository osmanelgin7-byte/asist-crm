import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { canAccessTab, sessionHasPermission, type AppTabId } from "@/lib/app-tabs";
import type { Permission, Role } from "@/lib/permissions";

export async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const allowedTabs = session.user.allowedTabs ?? null;

  return {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    role: session.user.role as Role,
    allowedTabs,
    can(permission: Permission) {
      return sessionHasPermission(session.user.role as Role, allowedTabs, permission);
    },
  };
}

export async function requireAuth() {
  const user = await getSessionUser();
  if (!user) {
    return { user: null, error: NextResponse.json({ error: "Oturum gerekli" }, { status: 401 }) };
  }
  return { user, error: null };
}

export async function requirePermission(permission: Permission) {
  const { user, error } = await requireAuth();
  if (error) return { user: null, error };

  if (!user!.can(permission)) {
    return {
      user: null,
      error: NextResponse.json({ error: "Bu işlem için yetkiniz yok" }, { status: 403 }),
    };
  }

  return { user, error: null };
}

export async function requireTabAccess(tabId: AppTabId, permission?: Permission) {
  const { user, error } = await requireAuth();
  if (error) return { user: null, error };

  if (!canAccessTab(user!.role, user!.allowedTabs, tabId)) {
    return {
      user: null,
      error: NextResponse.json({ error: "Bu işlem için yetkiniz yok" }, { status: 403 }),
    };
  }

  if (permission && !user!.can(permission)) {
    return {
      user: null,
      error: NextResponse.json({ error: "Bu işlem için yetkiniz yok" }, { status: 403 }),
    };
  }

  return { user, error: null };
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  allowedTabs: AppTabId[] | null;
  can: (permission: Permission) => boolean;
};

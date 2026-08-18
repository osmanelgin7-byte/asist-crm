"use client";

import { useSession } from "next-auth/react";
import { sessionHasPermission, type AppTabId } from "@/lib/app-tabs";
import type { Permission, Role } from "@/lib/permissions";

export function usePermissions() {
  const { data: session } = useSession();
  const role = session?.user?.role as Role | undefined;
  const allowedTabs = (session?.user?.allowedTabs as AppTabId[] | null) ?? null;

  function can(permission: Permission): boolean {
    if (!role) return false;
    return sessionHasPermission(role, allowedTabs, permission);
  }

  return { role, allowedTabs, can, isAdmin: role === "ADMIN" };
}

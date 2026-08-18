import { DefaultSession } from "next-auth";
import type { Role } from "@/lib/permissions";
import type { AppTabId } from "@/lib/app-tabs";

declare module "next-auth" {
  interface Session {
    apiToken?: string;
    user: {
      id: string;
      role: Role;
      allowedTabs: AppTabId[] | null;
      isFirstLogin: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    allowedTabs: AppTabId[] | null;
    isFirstLogin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    allowedTabs: AppTabId[] | null;
    isFirstLogin?: boolean;
    apiToken?: string;
  }
}

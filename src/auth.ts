import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { logActivity } from "@/lib/activity-log";
import type { Role } from "@/lib/permissions";
import type { AppTabId } from "@/lib/app-tabs";
import { parseAllowedTabs } from "@/lib/app-tabs";
import { signAuthToken } from "@/lib/auth-token";

if (process.env.NODE_ENV === "production") {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || secret === "change-me-in-production") {
    throw new Error("Production ortamında güçlü bir AUTH_SECRET tanımlanmalıdır");
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Kullanıcı Adı", type: "text" },
        password: { label: "Şifre", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const identifier = (credentials.username as string).toLowerCase();
        const password = credentials.password as string;

        const user = await prisma.user.findFirst({
          where: {
            OR: [{ username: identifier }, { email: identifier }],
          },
        });

        if (!user || !user.active) {
          return null;
        }

        const valid = await verifyPassword(password, user.password);
        if (!valid) {
          return null;
        }

        const now = new Date();
        const isFirstLogin = !user.firstLoginAt;

        await prisma.user.update({
          where: { id: user.id },
          data: {
            firstLoginAt: user.firstLoginAt ?? now,
            lastLoginAt: now,
          },
        });

        await prisma.loginSession.create({
          data: { userId: user.id },
        });

        logActivity({
          userId: user.id,
          action: "login",
          entityType: "session",
          details: isFirstLogin ? "İlk giriş" : undefined,
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          allowedTabs: parseAllowedTabs(user.allowedTabs),
          isFirstLogin,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = (user as { role: Role }).role;
        token.allowedTabs = (user as { allowedTabs?: AppTabId[] | null }).allowedTabs ?? null;
        token.isFirstLogin = (user as { isFirstLogin?: boolean }).isFirstLogin ?? false;
      }

      if (token.id && token.role) {
        try {
          token.apiToken = await signAuthToken(
            {
              id: token.id as string,
              name: (token.name as string) ?? "",
              email: (token.email as string) ?? "",
              role: token.role as Role,
              allowedTabs: (token.allowedTabs as AppTabId[] | null) ?? null,
            },
            { isFirstLogin: Boolean(token.isFirstLogin) }
          );
        } catch (error) {
          console.error("apiToken oluşturulamadı:", error);
        }
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.allowedTabs = (token.allowedTabs as AppTabId[] | null) ?? null;
        session.user.isFirstLogin = Boolean(token.isFirstLogin);
      }
      session.apiToken = token.apiToken as string | undefined;
      return session;
    },
  },
});

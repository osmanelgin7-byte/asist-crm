import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { signAuthToken } from "../lib/session.js";
import { verifyPassword } from "@asistcrm/lib/password";
import { logActivity } from "../lib/activity-log.js";
import { parseAllowedTabs } from "@asistcrm/lib/app-tabs";
import type { Role } from "@asistcrm/lib/permissions";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const username = typeof req.body?.username === "string" ? req.body.username.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!username || !password) {
    res.status(400).json({ error: "Kullanıcı adı ve şifre gerekli" });
    return;
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ username }, { email: username }] },
  });

  if (!user || !user.active) {
    res.status(401).json({ error: "Kullanıcı adı veya şifre hatalı" });
    return;
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    res.status(401).json({ error: "Kullanıcı adı veya şifre hatalı" });
    return;
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

  await prisma.loginSession.create({ data: { userId: user.id } });

  logActivity({
    userId: user.id,
    action: "login",
    entityType: "session",
    details: isFirstLogin ? "İlk giriş" : undefined,
  });

  const authUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    allowedTabs: parseAllowedTabs(user.allowedTabs),
  };

  const token = await signAuthToken(authUser, { isFirstLogin });

  res.json({
    token,
    user: { ...authUser, isFirstLogin },
  });
});

authRouter.get("/me", async (req, res) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) {
    res.status(401).json({ error: "Oturum gerekli" });
    return;
  }

  const { verifyAuthToken } = await import("../lib/session.js");
  const user = verifyAuthToken(token);
  if (!user) {
    res.status(401).json({ error: "Geçersiz oturum" });
    return;
  }

  res.json({ user });
});

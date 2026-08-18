import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import { hashPassword } from "@/lib/password";
import { serializeAllowedTabs, type AppTabId, isAppTabId } from "@/lib/app-tabs";
import { parseRole, validatePassword } from "@/lib/security";
import type { Role } from "@/lib/permissions";

function parseAllowedTabsBody(value: unknown): AppTabId[] | null {
  if (value === null || value === undefined) return null;
  if (!Array.isArray(value)) return null;
  return value.filter((item): item is AppTabId => typeof item === "string" && isAppTabId(item));
}

export async function GET() {
  const { error } = await requirePermission("users:manage");
  if (error) return error;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      role: true,
      allowedTabs: true,
      active: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const { error } = await requirePermission("users:manage");
  if (error) return error;

  const body = await request.json();
  const { name, username, email, password, role, allowedTabs } = body;

  if (!name || !username || !email || !password) {
    return NextResponse.json(
      { error: "Ad, kullanıcı adı, e-posta ve şifre gerekli" },
      { status: 400 }
    );
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  let roleValue: Role = "PLANLAMA";
  if (role !== undefined && role !== null) {
    const parsedRole = parseRole(role);
    if (!parsedRole) {
      return NextResponse.json({ error: "Geçersiz rol" }, { status: 400 });
    }
    roleValue = parsedRole;
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Bu e-posta zaten kayıtlı" },
      { status: 409 }
    );
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role: roleValue,
      allowedTabs: serializeAllowedTabs(parseAllowedTabsBody(allowedTabs)),
    },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      role: true,
      allowedTabs: true,
      active: true,
      createdAt: true,
    },
  });

  return NextResponse.json(user, { status: 201 });
}

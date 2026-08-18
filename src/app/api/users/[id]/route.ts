import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import { hashPassword } from "@/lib/password";
import { serializeAllowedTabs, isAppTabId, type AppTabId } from "@/lib/app-tabs";
import { parseRole, validatePassword } from "@/lib/security";

function parseAllowedTabsBody(value: unknown): AppTabId[] | null {
  if (value === null || value === undefined) return null;
  if (!Array.isArray(value)) return null;
  return value.filter((item): item is AppTabId => typeof item === "string" && isAppTabId(item));
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user: currentUser, error } = await requirePermission("users:manage");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const { name, email, password, role, active, allowedTabs } = body;

  if (id === currentUser!.id && active === false) {
    return NextResponse.json(
      { error: "Kendi hesabınızı devre dışı bırakamazsınız" },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = {};
  if (name) data.name = name;
  if (email) data.email = email.toLowerCase();
  if (role !== undefined) {
    const parsedRole = parseRole(role);
    if (!parsedRole) {
      return NextResponse.json({ error: "Geçersiz rol" }, { status: 400 });
    }
    data.role = parsedRole;
  }
  if (active !== undefined) data.active = active;
  if (password) {
    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }
    data.password = await hashPassword(password);
  }
  if (allowedTabs !== undefined) {
    data.allowedTabs = serializeAllowedTabs(parseAllowedTabsBody(allowedTabs));
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      allowedTabs: true,
      active: true,
      createdAt: true,
    },
  });

  return NextResponse.json(user);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user: currentUser, error } = await requirePermission("users:manage");
  if (error) return error;

  const { id } = await params;

  if (id === currentUser!.id) {
    return NextResponse.json(
      { error: "Kendi hesabınızı silemezsiniz" },
      { status: 400 }
    );
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

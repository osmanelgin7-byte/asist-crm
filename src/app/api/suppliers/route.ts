import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import { buildSupplierSearchWhere, parseSupplierSearchParams, hasSupplierSearchFilters } from "@/lib/supplier-search";

export async function GET(request: Request) {
  const { error } = await requirePermission("suppliers:read");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const filters = parseSupplierSearchParams(Object.fromEntries(searchParams.entries()));
  const legacyQuery = searchParams.get("q")?.trim();

  let where = await buildSupplierSearchWhere(prisma, filters);

  if (legacyQuery && !hasSupplierSearchFilters(filters)) {
    where = {
      OR: [
        { firstName: { contains: legacyQuery } },
        { lastName: { contains: legacyQuery } },
        { iban: { contains: legacyQuery } },
        { city: { contains: legacyQuery } },
        { district: { contains: legacyQuery } },
        { phone: { contains: legacyQuery } },
        { notes: { contains: legacyQuery } },
      ],
    };
  }

  const suppliers = await prisma.supplier.findMany({
    where,
    include: { _count: { select: { workOrders: true } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return NextResponse.json(suppliers);
}

export async function POST(request: Request) {
  const { error } = await requirePermission("suppliers:write");
  if (error) return error;

  const body = await request.json();
  const { firstName, lastName, iban, city, district, phone, notes } = body;

  if (!firstName || !lastName || !iban) {
    return NextResponse.json(
      { error: "Ad, soyad ve IBAN gerekli" },
      { status: 400 }
    );
  }

  const supplier = await prisma.supplier.create({
    data: {
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      iban: String(iban).replace(/\s/g, "").toUpperCase(),
      city: city?.trim() || null,
      district: district?.trim() || null,
      phone: phone?.trim() || null,
      notes: notes?.trim() || null,
    },
  });
  return NextResponse.json(supplier, { status: 201 });
}

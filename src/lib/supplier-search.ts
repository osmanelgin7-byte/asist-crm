import type { Prisma, PrismaClient } from "@prisma/client";
import { listJobTypeDefinitions } from "@/lib/job-types";

export interface SupplierSearchFilters {
  firstName?: string;
  lastName?: string;
  phone?: string;
  city?: string;
  district?: string;
  service?: string;
}

export const supplierSearchParamKeys = {
  firstName: "ad",
  lastName: "soyad",
  phone: "telefon",
  city: "il",
  district: "ilce",
  service: "hizmet",
} as const;

export function parseSupplierSearchParams(
  params: Record<string, string | string[] | undefined>
): SupplierSearchFilters {
  function pick(key: keyof typeof supplierSearchParamKeys): string | undefined {
    const raw = params[supplierSearchParamKeys[key]];
    const value = Array.isArray(raw) ? raw[0] : raw;
    const trimmed = value?.trim();
    return trimmed || undefined;
  }

  return {
    firstName: pick("firstName"),
    lastName: pick("lastName"),
    phone: pick("phone"),
    city: pick("city"),
    district: pick("district"),
    service: pick("service"),
  };
}

export function hasSupplierSearchFilters(filters: SupplierSearchFilters): boolean {
  return Object.values(filters).some(Boolean);
}

export function buildSupplierSearchQuery(filters: SupplierSearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.firstName) params.set(supplierSearchParamKeys.firstName, filters.firstName);
  if (filters.lastName) params.set(supplierSearchParamKeys.lastName, filters.lastName);
  if (filters.phone) params.set(supplierSearchParamKeys.phone, filters.phone);
  if (filters.city) params.set(supplierSearchParamKeys.city, filters.city);
  if (filters.district) params.set(supplierSearchParamKeys.district, filters.district);
  if (filters.service) params.set(supplierSearchParamKeys.service, filters.service);
  return params;
}

export async function buildSupplierSearchWhere(
  prisma: PrismaClient,
  filters: SupplierSearchFilters
): Promise<Prisma.SupplierWhereInput | undefined> {
  const conditions: Prisma.SupplierWhereInput[] = [];

  if (filters.firstName) {
    conditions.push({ firstName: { contains: filters.firstName } });
  }
  if (filters.lastName) {
    conditions.push({ lastName: { contains: filters.lastName } });
  }
  if (filters.phone) {
    conditions.push({ phone: { contains: filters.phone } });
  }
  if (filters.city) {
    conditions.push({ city: { contains: filters.city } });
  }
  if (filters.district) {
    conditions.push({ district: { contains: filters.district } });
  }

  if (filters.service) {
    const service = filters.service;
    const serviceLower = service.toLowerCase();
    const jobTypes = await listJobTypeDefinitions(prisma, false);
    const matchingJobTypeCodes = jobTypes
      .filter(
        (item) =>
          item.label.toLowerCase().includes(serviceLower) ||
          item.code.toLowerCase().includes(serviceLower)
      )
      .map((item) => item.code);

    const workOrderMatches: Prisma.WorkOrderWhereInput[] = [
      { title: { contains: service } },
      { jobType: { contains: service } },
    ];
    if (matchingJobTypeCodes.length > 0) {
      workOrderMatches.push({ jobType: { in: matchingJobTypeCodes } });
    }

    conditions.push({
      OR: [
        { notes: { contains: service } },
        { workOrders: { some: { OR: workOrderMatches } } },
      ],
    });
  }

  if (conditions.length === 0) return undefined;
  return { AND: conditions };
}

import { PrismaClient } from "@prisma/client";

/** Bump when Prisma schema changes so dev hot-reload discards stale clients. */
const PRISMA_CLIENT_VERSION = 10;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaVersion: number | undefined;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function workOrderHasRepairImagesRelation(client: PrismaClient): boolean {
  const dmmf = (
    client as unknown as {
      _baseDmmf?: { datamodel?: { models?: { name: string; fields?: { name: string }[] }[] } };
    }
  )._baseDmmf;

  const workOrder = dmmf?.datamodel?.models?.find((model) => model.name === "WorkOrder");
  return workOrder?.fields?.some((field) => field.name === "repairImages") ?? false;
}

function isFreshClient(client: PrismaClient): boolean {
  return (
    globalForPrisma.prismaVersion === PRISMA_CLIENT_VERSION &&
    "jobTypeDefinition" in client &&
    "workOrderRepairImage" in client &&
    "mailSetting" in client &&
    "mailMessage" in client &&
    workOrderHasRepairImagesRelation(client)
  );
}

function getPrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma;

  if (cached && isFreshClient(cached)) {
    return cached;
  }

  const stale = cached;
  if (stale) {
    void stale.$disconnect();
  }

  const client = createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
    globalForPrisma.prismaVersion = PRISMA_CLIENT_VERSION;
  }

  return client;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

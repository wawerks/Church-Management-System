import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// Prisma client singleton for dev (prevents exhausting DB connections on hot reload).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** Hot reload can keep an old PrismaClient from before `prisma generate`; that instance has no workbook delegates. */
function clientHasWorkbookModels(client: PrismaClient): boolean {
  const d = client as unknown as { financialRuleSet?: { upsert?: unknown } };
  return typeof d.financialRuleSet?.upsert === "function";
}

function toMariaDbUrl(url: string) {
  // @prisma/adapter-mariadb expects mariadb:// URLs.
  // Keep your DATABASE_URL compatible with Prisma migrations by converting here.
  if (!url.startsWith("mysql://")) return url;
  const u = new URL(url);
  const user = u.username;
  const pass = u.password; // may be empty string
  const auth = pass ? `${user}:${pass}` : user;
  return `mariadb://${auth}@${u.host}${u.pathname}${u.search}`;
}

function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaMariaDb(
      toMariaDbUrl(
        process.env.DATABASE_URL ??
          "mysql://root:password@localhost:3306/church",
      ),
    ),
  });
}

const cached = globalForPrisma.prisma;
export const prisma =
  cached && clientHasWorkbookModels(cached) ? cached : createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;


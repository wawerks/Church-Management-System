import bcrypt from "bcryptjs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import type { Role } from "../src/generated/prisma/enums";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;

  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL in environment.");
  }
  if (!adminEmail || !adminPassword) {
    throw new Error(
      "Missing ADMIN_EMAIL or ADMIN_SEED_PASSWORD in environment.",
    );
  }

  const toMariaDbUrl = (url: string) => {
    if (!url.startsWith("mysql://")) return url;
    const u = new URL(url);
    const user = u.username;
    const pass = u.password; // may be empty string
    const auth = pass ? `${user}:${pass}` : user;
    return `mariadb://${auth}@${u.host}${u.pathname}${u.search}`;
  };

  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(toMariaDbUrl(databaseUrl)),
  });

  try {
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
      select: { id: true, role: true },
    });

    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await prisma.user.create({
        data: {
          name: "Church Admin",
          email: adminEmail,
          passwordHash,
          role: "ADMIN" satisfies Role,
        },
      });
      console.log(`Seeded admin user: ${adminEmail}`);
    } else {
      console.log(`Admin user already exists: ${adminEmail}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


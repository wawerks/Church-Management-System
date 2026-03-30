import bcrypt from "bcryptjs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import type { Role } from "../src/generated/prisma/enums";

/**
 * Church budget reference: % of monthly Service Income per ExpenseType.
 * Upserted by unique `name` so `npx prisma db seed` is safe to re-run.
 */
const BUDGET_EXPENSE_TYPES: ReadonlyArray<{
  name: string;
  allocationPercent: number;
}> = [
  // Core Activities
  {
    name: "Monthly Prayer and Thanksgiving Session",
    allocationPercent: 1,
  },
  {
    name:
      "Evangelism/Discipleship/Revival/Children's Vacation Bible School (VBS)/Camp",
    allocationPercent: 3,
  },
  { name: "Pastor's Appreciation", allocationPercent: 0.5 },
  { name: "Conference Calls Attendance", allocationPercent: 2 },
  {
    name: "Thanksgiving Celebration and Christmas Celebration",
    allocationPercent: 3,
  },
  { name: "Youth Fellowship", allocationPercent: 3 },
  // Project Activities
  {
    name: "Floor Tiling/Pathway/Youth Center/Lot Survey/Perimeter Fencing",
    allocationPercent: 2,
  },
  // Support Activities
  { name: "Mission", allocationPercent: 1 },
  { name: "ARM", allocationPercent: 1 },
  { name: "Conference Contribution", allocationPercent: 7 },
  { name: "LLBC Aid", allocationPercent: 1 },
  { name: "Host Pastor's Honorarium", allocationPercent: 42 },
  { name: "Host Pastor's Bonus", allocationPercent: 1.5 },
  {
    name: "Pastor's/Official Representatives Travelling",
    allocationPercent: 0.5,
  },
  { name: "Assistant Pastor's Allowance", allocationPercent: 17.5 },
  { name: "Assistant Pastor's Bonus", allocationPercent: 1.5 },
  { name: "Treasurer's Honorarium", allocationPercent: 3 },
  { name: "Church Maintenance", allocationPercent: 3 },
  { name: "Electricity", allocationPercent: 2.5 },
  { name: "Water Bill", allocationPercent: 1 },
  {
    name: "Musical Equipment/Sound System Maintenance",
    allocationPercent: 1,
  },
  { name: "Repair and Maintenance", allocationPercent: 1 },
  { name: "Supplies and Materials", allocationPercent: 1 },
];

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

    // Align older DB labels with the current Work Financial Plan spreadsheet.
    await prisma.expenseType.updateMany({
      where: { name: "Thanksgiving and Christmas Celebration" },
      data: { name: "Thanksgiving Celebration and Christmas Celebration" },
    });
    await prisma.expenseType.updateMany({
      where: { name: "Thanksgiving Celebration and Christmas Celebration 2025" },
      data: { name: "Thanksgiving Celebration and Christmas Celebration" },
    });
    await prisma.expenseType.updateMany({
      where: { name: "Pastor's/Official Representatives Travelling Allowance" },
      data: { name: "Pastor's/Official Representatives Travelling" },
    });

    for (const row of BUDGET_EXPENSE_TYPES) {
      await prisma.expenseType.upsert({
        where: { name: row.name },
        create: {
          name: row.name,
          allocationPercent: row.allocationPercent,
          isAllocatedFromServiceIncome: true,
        },
        update: {
          allocationPercent: row.allocationPercent,
          isAllocatedFromServiceIncome: true,
        },
      });
    }
    console.log(
      `Upserted ${BUDGET_EXPENSE_TYPES.length} expense types (budget % reference).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


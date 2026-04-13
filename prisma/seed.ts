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

const WORKBOOK_ACTIVITY_TEMPLATES: ReadonlyArray<{
  name: string;
  category: "CORE" | "PROJECT" | "SUPPORT";
  standardPct: number;
  sortOrder: number;
}> = [
  { name: "Monthly Prayer and Thanksgiving Session", category: "CORE", standardPct: 0.01, sortOrder: 10 },
  { name: "Evangelism/Discipleship/Revival/Children's Vacation Bible School (VBS)/Camp", category: "CORE", standardPct: 0.03, sortOrder: 20 },
  { name: "Pastor's Appreciation", category: "CORE", standardPct: 0.005, sortOrder: 30 },
  { name: "Conference Calls Attendance", category: "CORE", standardPct: 0.02, sortOrder: 40 },
  { name: "Thanksgiving Celebration and Christmas Celebration", category: "CORE", standardPct: 0.03, sortOrder: 50 },
  { name: "Youth Fellowship", category: "CORE", standardPct: 0.03, sortOrder: 60 },
  { name: "Floor Tiling/Pathway/Youth Center/Lot Survey/Perimeter Fencing", category: "PROJECT", standardPct: 0.02, sortOrder: 110 },
  { name: "Mission", category: "SUPPORT", standardPct: 0.01, sortOrder: 210 },
  { name: "ARM", category: "SUPPORT", standardPct: 0.01, sortOrder: 220 },
  { name: "Conference Contribution", category: "SUPPORT", standardPct: 0.07, sortOrder: 230 },
  { name: "LLBC Aid", category: "SUPPORT", standardPct: 0.01, sortOrder: 240 },
  { name: "Host Pastor's Honorarium", category: "SUPPORT", standardPct: 0.42, sortOrder: 250 },
  { name: "Assistant Pastor's Allowance", category: "SUPPORT", standardPct: 0.175, sortOrder: 260 },
  { name: "Treasurer's Honorarium", category: "SUPPORT", standardPct: 0.03, sortOrder: 270 },
  { name: "Church Maintenance", category: "SUPPORT", standardPct: 0.03, sortOrder: 280 },
  { name: "Electricity", category: "SUPPORT", standardPct: 0.025, sortOrder: 290 },
  { name: "Musical Equipment/Sound System Maintenance", category: "SUPPORT", standardPct: 0.01, sortOrder: 300 },
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

    await prisma.financialRuleSet.upsert({
      where: { id: "workbook-rule-jan-apr" },
      create: {
        id: "workbook-rule-jan-apr",
        name: "Workbook Jan-Apr Rule",
        effectiveFrom: new Date("2025-01-01T00:00:00.000Z"),
        effectiveTo: new Date("2025-05-01T00:00:00.000Z"),
        conferencePercent: 10,
        missionPercent: 1,
        armPercent: 1,
        llbcPercent: 1,
        isActive: true,
      },
      update: {
        name: "Workbook Jan-Apr Rule",
        effectiveFrom: new Date("2025-01-01T00:00:00.000Z"),
        effectiveTo: new Date("2025-05-01T00:00:00.000Z"),
        conferencePercent: 10,
        missionPercent: 1,
        armPercent: 1,
        llbcPercent: 1,
        isActive: true,
      },
    });
    await prisma.financialRuleSet.upsert({
      where: { id: "workbook-rule-may-dec" },
      create: {
        id: "workbook-rule-may-dec",
        name: "Workbook May-Dec Rule",
        effectiveFrom: new Date("2025-05-01T00:00:00.000Z"),
        conferencePercent: 7,
        missionPercent: 1,
        armPercent: 1,
        llbcPercent: 1,
        isActive: true,
      },
      update: {
        name: "Workbook May-Dec Rule",
        effectiveFrom: new Date("2025-05-01T00:00:00.000Z"),
        effectiveTo: null,
        conferencePercent: 7,
        missionPercent: 1,
        armPercent: 1,
        llbcPercent: 1,
        isActive: true,
      },
    });

    for (const row of WORKBOOK_ACTIVITY_TEMPLATES) {
      await prisma.financialActivityTemplate.upsert({
        where: { name_category: { name: row.name, category: row.category } },
        create: row,
        update: {
          standardPct: row.standardPct,
          sortOrder: row.sortOrder,
          isActive: true,
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


import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  DEFAULT_ACTIVITY_TEMPLATES,
} from "../src/lib/workbook-finance-store";
import { computeWorkbookPeriod } from "../src/lib/workbook-finance";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error("DATABASE_URL is required");

const xlsPath =
  process.argv[2] ??
  path.resolve(process.cwd(), "KFMC-Work-and-Financial-Plan-CY2025_A.xls");

if (!fs.existsSync(xlsPath)) {
  throw new Error(`Workbook not found: ${xlsPath}`);
}

const toMariaDbUrl = (url: string) => {
  if (!url.startsWith("mysql://")) return url;
  const u = new URL(url);
  return `mariadb://${u.username}:${u.password}@${u.host}${u.pathname}${u.search}`;
};

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(toMariaDbUrl(dbUrl)),
});

const MONTH_SHEETS: Record<string, string> = {
  "2025-05": "may 2025",
  "2025-06": "june 2025",
  "2025-07": "july 2025",
  "2025-08": "aug2025",
  "2025-09": "sept2025",
  "2025-10": "oct2025",
  "2025-11": "nov2025",
  "2025-12": "dec2025",
  "2026-01": "jan.2026",
  "2026-02": "feb.2026",
};

function parseNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const num = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(num) ? num : 0;
  }
  return 0;
}

async function main() {
  const workbook = XLSX.readFile(xlsPath, { cellDates: false });

  const batch = await prisma.financialImportBatch.create({
    data: {
      sourceFile: xlsPath,
      status: "RUNNING",
      startedAt: new Date(),
      summary: {},
    },
  });

  try {
    // Ensure defaults
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
      },
      update: {},
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
      },
      update: {},
    });

    for (const row of DEFAULT_ACTIVITY_TEMPLATES) {
      await prisma.financialActivityTemplate.upsert({
        where: { name_category: { name: row.name, category: row.category } },
        create: row,
        update: { standardPct: row.standardPct, sortOrder: row.sortOrder, isActive: true },
      });
    }

    const templates = await prisma.financialActivityTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    });

    for (const [monthKey, sheetName] of Object.entries(MONTH_SHEETS)) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true });
      if (rows.length < 8) continue;

      const incomeTotalsRow = rows[4] ?? [];
      const opening = parseNumber(incomeTotalsRow[3]);
      const weeklyValues: Array<number> = [5, 7, 9, 11, 13]
        .map((idx) => parseNumber(incomeTotalsRow[idx]))
        .filter((n) => n !== 0);

      const periodStart = new Date(`${monthKey}-01T00:00:00.000Z`);
      const periodEndExclusive = new Date(periodStart);
      periodEndExclusive.setUTCMonth(periodEndExclusive.getUTCMonth() + 1);

      const ruleSetId =
        monthKey <= "2025-04" ? "workbook-rule-jan-apr" : "workbook-rule-may-dec";

      const period = await prisma.financialPeriod.upsert({
        where: { monthKey },
        create: {
          monthKey,
          title: monthKey,
          periodStart,
          periodEndExclusive,
          openingBalance: opening,
          status: "DRAFT",
          ruleSetId,
        },
        update: {
          periodStart,
          periodEndExclusive,
          openingBalance: opening,
          ruleSetId,
        },
      });

      await prisma.financialWeeklyIncomeEntry.deleteMany({ where: { periodId: period.id } });
      await prisma.financialWeeklyIncomeEntry.create({
        data: {
          periodId: period.id,
          kind: "OPENING",
          label: "Opening Balance",
          sortOrder: 0,
          amount: opening,
        },
      });
      for (let i = 0; i < weeklyValues.length; i += 1) {
        await prisma.financialWeeklyIncomeEntry.create({
          data: {
            periodId: period.id,
            kind: "WEEKLY",
            label: `Week ${i + 1}`,
            sortOrder: i + 1,
            amount: weeklyValues[i],
          },
        });
      }

      const ledgerSeed = templates.map((template) => {
        const sheetRow = rows.find(
          (r) =>
            typeof r?.[0] === "string" &&
            String(r[0]).trim().toLowerCase() === template.name.trim().toLowerCase(),
        );
        return {
          activityId: template.id,
          carryOverIn: parseNumber(sheetRow?.[3]),
          adjustmentAmount: parseNumber(sheetRow?.[16] ?? 0),
          expenseAmount: parseNumber(sheetRow?.[15] ?? 0),
        };
      });

      const result = computeWorkbookPeriod({
        openingBalance: opening,
        incomeEntries: [{ label: "Opening Balance", amount: opening, sortOrder: 0 }, ...weeklyValues.map((x, i) => ({ label: `Week ${i + 1}`, amount: x, sortOrder: i + 1 }))],
        templates: templates.map((t) => ({
          id: t.id,
          name: t.name,
          category: t.category,
          standardPct: Number(t.standardPct),
          sortOrder: t.sortOrder,
        })),
        ledgers: ledgerSeed,
        ruleSet: {
          conferencePercent: monthKey <= "2025-04" ? 10 : 7,
          missionPercent: 1,
          armPercent: 1,
          llbcPercent: 1,
        },
      });

      for (const row of result.ledgers) {
        await prisma.financialActivityLedger.upsert({
          where: { periodId_activityId: { periodId: period.id, activityId: row.activityId } },
          create: { periodId: period.id, ...row },
          update: row,
        });
      }

      await prisma.financialRemittanceLedger.upsert({
        where: { periodId: period.id },
        create: { periodId: period.id, ...result.remittance },
        update: result.remittance,
      });

      await prisma.financialConferenceMonthly.upsert({
        where: { monthKey },
        create: {
          monthKey,
          periodId: period.id,
          income: result.monthlyIncome,
          actualExpenses: result.actualExpenses,
          actualRemittance: result.remittance.totalRemittance,
          missionAmount: result.remittance.missionAmount,
          armAmount: result.remittance.armAmount,
          llbcAmount: result.remittance.llbcAmount,
          conferenceAmount: result.remittance.conferenceAmount,
          netBalance: result.closingBalance,
          appliedPercent: result.remittance.conferencePercent,
        },
        update: {
          periodId: period.id,
          income: result.monthlyIncome,
          actualExpenses: result.actualExpenses,
          actualRemittance: result.remittance.totalRemittance,
          missionAmount: result.remittance.missionAmount,
          armAmount: result.remittance.armAmount,
          llbcAmount: result.remittance.llbcAmount,
          conferenceAmount: result.remittance.conferenceAmount,
          netBalance: result.closingBalance,
          appliedPercent: result.remittance.conferencePercent,
        },
      });

      await prisma.financialImportEntry.create({
        data: {
          batchId: batch.id,
          sourceSheet: sheetName,
          recordType: "MONTH_IMPORT",
          targetId: period.id,
          payload: { monthKey, weeklyValues, opening, computed: result },
        },
      });
    }

    await prisma.financialImportBatch.update({
      where: { id: batch.id },
      data: {
        status: "SUCCESS",
        finishedAt: new Date(),
      },
    });
    console.log(`Workbook import complete: batch ${batch.id}`);
  } catch (error) {
    await prisma.financialImportBatch.update({
      where: { id: batch.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        summary: {
          error: error instanceof Error ? error.message : String(error),
        },
      },
    });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

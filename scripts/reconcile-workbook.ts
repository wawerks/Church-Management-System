import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error("DATABASE_URL is required");

const toMariaDbUrl = (url: string) => {
  if (!url.startsWith("mysql://")) return url;
  const u = new URL(url);
  return `mariadb://${u.username}:${u.password}@${u.host}${u.pathname}${u.search}`;
};

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(toMariaDbUrl(dbUrl)),
});

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function main() {
  const periods = await prisma.financialPeriod.findMany({
    include: { remittanceLedger: true },
    orderBy: { monthKey: "asc" },
  });
  if (periods.length === 0) {
    console.log("No workbook periods found.");
    return;
  }

  let passed = 0;
  let failed = 0;
  for (const period of periods) {
    const ledgerAgg = await prisma.financialActivityLedger.aggregate({
      _sum: {
        allocatedAmount: true,
        expenseAmount: true,
        adjustmentAmount: true,
      },
      where: { periodId: period.id },
    });
    const allocated = Number(ledgerAgg._sum.allocatedAmount ?? 0);
    const expense = Number(ledgerAgg._sum.expenseAmount ?? 0);
    const adjust = Number(ledgerAgg._sum.adjustmentAmount ?? 0);
    const expectedClosing =
      Number(period.openingBalance) + allocated + adjust - expense;
    const actualClosing = Number(period.closingBalance);
    const diff = Math.abs(expectedClosing - actualClosing);
    const ok = diff < 0.01;
    if (ok) passed += 1;
    else failed += 1;
    console.log(
      `${ok ? "PASS" : "FAIL"} ${period.monthKey}: expected ${money(expectedClosing)} vs saved ${money(actualClosing)} (diff ${money(diff)})`,
    );
  }

  console.log(`\nReconciliation done. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exitCode = 2;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());

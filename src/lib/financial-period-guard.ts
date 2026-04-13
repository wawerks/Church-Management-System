import { prisma } from "@/lib/prisma";

export function toMonthKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

export async function assertFinancialPeriodWritableByDate(value: Date) {
  const monthKey = toMonthKey(value);
  const period = await prisma.financialPeriod.findUnique({
    where: { monthKey },
    select: { status: true },
  });
  if (!period) return;
  if (period.status !== "DRAFT") {
    throw new Error(`Financial period ${monthKey} is ${period.status}. Edits are locked.`);
  }
}

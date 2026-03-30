import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
} from "docx";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import type { Role } from "@/generated/prisma/enums";

type Format = "xlsx" | "pdf" | "docx";
type GroupBy = "daily" | "monthly" | "yearly";

function toInputDate(value: string | null) {
  if (!value) return null;
  const s = value.trim();
  if (!s) return null;
  return s;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function keyFor(d: Date, groupBy: GroupBy) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  if (groupBy === "daily") return `${y}-${m}-${day}`;
  if (groupBy === "monthly") return `${y}-${m}`;
  return `${y}`;
}

function labelFor(key: string, groupBy: GroupBy) {
  // keep key human-readable
  if (groupBy === "daily") return key;
  if (groupBy === "monthly") return key;
  return key;
}

function formatMoney(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Exports: Admin + Staff + Treasurer (Pastor is view-only on report pages). */
function isAllowedRole(role: string): role is Role {
  return role === "ADMIN" || role === "STAFF" || role === "TREASURER";
}

async function financialData(params: URLSearchParams) {
  const format = (params.get("format") ?? "xlsx") as Format;
  const groupBy = (params.get("groupBy") ?? "monthly") as GroupBy;
  const fromStr = toInputDate(params.get("from"));
  const toStr = toInputDate(params.get("to"));

  const allowedFormats: Format[] = ["xlsx", "pdf", "docx"];
  const allowedGroupBy: GroupBy[] = ["daily", "monthly", "yearly"];

  if (!allowedFormats.includes(format) || !allowedGroupBy.includes(groupBy)) {
    return { error: "Invalid format/groupBy." as const };
  }

  const today = new Date();
  const fromDate = fromStr ? new Date(fromStr) : new Date(today.getTime());
  const toDate = toStr ? new Date(toStr) : today;

  // Normalize range inclusively.
  const start = startOfDay(fromDate);
  const end = endOfDay(toDate);

  const donations = await prisma.donation.findMany({
    where: { isDeleted: false, date: { gte: start, lte: end } },
    select: { date: true, amount: true },
  });

  const serviceIncome = await prisma.serviceIncome.findMany({
    where: { isDeleted: false, serviceDate: { gte: start, lte: end } },
    select: { serviceDate: true, amount: true },
  });

  const expenses = await prisma.expense.findMany({
    where: { isDeleted: false, date: { gte: start, lte: end } },
    select: { type: true, amount: true, date: true, receivedBy: true },
  });

  const byKey: Record<
    string,
    {
      key: string;
      total: number;
      serviceIncome: number;
      donations: number;
    }
  > = {};

  for (const d of donations) {
    const k = keyFor(d.date, groupBy);
    if (!byKey[k]) {
      byKey[k] = {
        key: k,
        total: 0,
        serviceIncome: 0,
        donations: 0,
      };
    }
    const amt = Number(d.amount ?? 0);
    byKey[k].total += amt;
    byKey[k].donations += amt;
  }

  for (const s of serviceIncome) {
    const k = keyFor(s.serviceDate, groupBy);
    if (!byKey[k]) {
      byKey[k] = {
        key: k,
        total: 0,
        serviceIncome: 0,
        donations: 0,
      };
    }
    const amt = Number(s.amount ?? 0);
    byKey[k].total += amt;
    byKey[k].serviceIncome += amt;
  }

  const rows = Object.values(byKey).sort((a, b) =>
    a.key.localeCompare(b.key),
  );

  const overallTithesOffering = serviceIncome.reduce(
    (sum, s) => sum + Number(s.amount ?? 0),
    0,
  );
  const overallDonations = donations.reduce(
    (sum, d) => sum + Number(d.amount ?? 0),
    0,
  );
  const overallExpenses = expenses.reduce(
    (sum, e) => sum + Number(e.amount ?? 0),
    0,
  );

  const expenseAgg: Record<
    string,
    { type: string; receivedBy: string; amount: number }
  > = {};
  for (const e of expenses) {
    const receivedBy = (e.receivedBy ?? "").trim() || "Unknown";
    const k = `${e.type}\0${receivedBy}`;
    if (!expenseAgg[k]) {
      expenseAgg[k] = { type: e.type, receivedBy, amount: 0 };
    }
    expenseAgg[k].amount += Number(e.amount ?? 0);
  }
  const expensesByType = Object.values(expenseAgg).sort((a, b) =>
    a.type !== b.type
      ? a.type.localeCompare(b.type)
      : a.receivedBy.localeCompare(b.receivedBy),
  );

  return {
    format,
    groupBy,
    start,
    end,
    rows,
    overallTithesOffering,
    overallDonations,
    overallExpenses,
    expensesByType,
  };
}

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session || !isAllowedRole(session.role)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const params = new URL(req.url).searchParams;

  try {
    const data = await financialData(params);
    if ("error" in data) {
      return NextResponse.json({ ok: false, message: data.error }, { status: 400 });
    }

    if (data.format === "xlsx") {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Financial Report");

      ws.columns = [
        { header: "Period", key: "period", width: 20 },
        { header: "Tithes & Offering", key: "serviceIncome", width: 18 },
        { header: "Donations", key: "donations", width: 14 },
        { header: "Total Income", key: "total", width: 14 },
      ];

      ws.getRow(1).font = { bold: true };
      for (const r of data.rows) {
        const row = ws.addRow({
          period: labelFor(r.key, data.groupBy),
          total: r.total,
          serviceIncome: r.serviceIncome,
          donations: r.donations,
        });
        row.getCell("total").numFmt = "#,##0.00";
        row.getCell("serviceIncome").numFmt = "#,##0.00";
        row.getCell("donations").numFmt = "#,##0.00";
        row.getCell("total").numFmt = "#,##0.00";
      }

      ws.addRow([]);
      ws.addRow(["Overall Totals"]);
      const tithesRow = ws.addRow(["Tithes & Offering", data.overallTithesOffering]);
      const donationsRow = ws.addRow(["Donations", data.overallDonations]);
      const expensesRow = ws.addRow(["Total Expenses", data.overallExpenses]);
      tithesRow.getCell(2).numFmt = "#,##0.00";
      donationsRow.getCell(2).numFmt = "#,##0.00";
      expensesRow.getCell(2).numFmt = "#,##0.00";

      ws.addRow([]);
      ws.addRow(["Expenses by Type"]);
      const expenseHeader = ws.addRow(["Type", "Received By", "Amount"]);
      expenseHeader.font = { bold: true };
      for (const ex of data.expensesByType) {
        const row = ws.addRow([ex.type, ex.receivedBy, ex.amount]);
        row.getCell(3).numFmt = "#,##0.00";
      }

      const buffer = await wb.xlsx.writeBuffer();
      return new NextResponse(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="financial-report.xlsx"`,
        },
      });
    }

    if (data.format === "pdf") {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      const title = `Financial Report (${data.groupBy})`;
      page.drawText(title, { x: 50, y: 800, size: 14, font });

      page.drawText(
        `Range: ${data.start.toLocaleDateString()} - ${data.end.toLocaleDateString()}`,
        { x: 50, y: 780, size: 10, font },
      );

      let y = 740;
      page.drawText(
        "Period | Tithes & Offering | Donations | Total Income",
        { x: 50, y, size: 10, font },
      );
      y -= 18;

      for (const r of data.rows) {
        const line = `${r.key} | ${formatMoney(r.total)} | ${formatMoney(r.serviceIncome)} | ${formatMoney(r.donations)}`;
        page.drawText(line, { x: 50, y, size: 9, font });
        y -= 14;
        if (y < 60) break;
      }

      y -= 8;
      page.drawText("Overall Totals", { x: 50, y, size: 10, font });
      y -= 14;
      page.drawText(`Tithes & Offering: ${formatMoney(data.overallTithesOffering)}`, {
        x: 50,
        y,
        size: 9,
        font,
      });
      y -= 14;
      page.drawText(`Donations: ${formatMoney(data.overallDonations)}`, {
        x: 50,
        y,
        size: 9,
        font,
      });
      y -= 14;
      page.drawText(`Total Expenses: ${formatMoney(data.overallExpenses)}`, {
        x: 50,
        y,
        size: 9,
        font,
      });
      y -= 18;
      page.drawText("Expenses by Type", { x: 50, y, size: 10, font });
      y -= 14;
      page.drawText("Type | Received By | Amount", { x: 50, y, size: 9, font });
      y -= 14;
      for (const ex of data.expensesByType) {
        page.drawText(
          `${ex.type} | ${ex.receivedBy} | ${formatMoney(ex.amount)}`,
          { x: 50, y, size: 9, font },
        );
        y -= 14;
        if (y < 60) break;
      }

      const pdfBytes = await pdfDoc.save();
      return new NextResponse(Buffer.from(pdfBytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="financial-report.pdf"`,
        },
      });
    }

    // docx
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: `Financial Report (${data.groupBy})`,
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              text: `Range: ${data.start.toLocaleDateString()} - ${data.end.toLocaleDateString()}`,
            }),
            new Paragraph({ text: "" }),
            new Table({
              width: { size: 100, type: "pct" },
              columnWidths: [1800, 1800, 1200, 1200],
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph("Period")] }),
                    new TableCell({
                      children: [new Paragraph("Tithes & Offering")],
                    }),
                    new TableCell({ children: [new Paragraph("Donations")] }),
                    new TableCell({ children: [new Paragraph("Total Income")] }),
                  ],
                }),
                ...data.rows.map(
                  (r) =>
                    new TableRow({
                      children: [
                        new TableCell({
                          children: [new Paragraph(labelFor(r.key, data.groupBy))],
                        }),
                        new TableCell({
                          children: [new Paragraph(formatMoney(r.serviceIncome))],
                        }),
                        new TableCell({
                          children: [new Paragraph(formatMoney(r.donations))],
                        }),
                        new TableCell({
                          children: [new Paragraph(formatMoney(r.total))],
                        }),
                      ],
                    }),
                ),
              ],
            }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "Overall Totals", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: `Tithes & Offering: ${formatMoney(data.overallTithesOffering)}` }),
            new Paragraph({ text: `Donations: ${formatMoney(data.overallDonations)}` }),
            new Paragraph({ text: `Total Expenses: ${formatMoney(data.overallExpenses)}` }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "Expenses by Type", heading: HeadingLevel.HEADING_2 }),
            new Table({
              width: { size: 100, type: "pct" },
              columnWidths: [2200, 2200, 1400],
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph("Type")] }),
                    new TableCell({ children: [new Paragraph("Received By")] }),
                    new TableCell({ children: [new Paragraph("Amount")] }),
                  ],
                }),
                ...data.expensesByType.map(
                  (ex) =>
                    new TableRow({
                      children: [
                        new TableCell({ children: [new Paragraph(ex.type)] }),
                        new TableCell({ children: [new Paragraph(ex.receivedBy)] }),
                        new TableCell({
                          children: [new Paragraph(formatMoney(ex.amount))],
                        }),
                      ],
                    }),
                ),
              ],
            }),
          ],
        },
      ],
    });

    const buf = await Packer.toBuffer(doc);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="financial-report.docx"`,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Failed to generate report." },
      { status: 500 },
    );
  }
}


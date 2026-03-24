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
import { AttendanceStatus as AttendanceStatusEnum } from "@/generated/prisma/enums";

type Format = "xlsx" | "pdf" | "docx";

/** Exports: Admin + Staff only (Pastor is view-only on report pages). */
function isAllowedRole(role: string): role is Role {
  return role === "ADMIN" || role === "STAFF";
}

function toInputDate(value: string | null) {
  if (!value) return null;
  const s = value.trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
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

function formatPercent(p: number) {
  if (!Number.isFinite(p)) return "0.0%";
  return `${p.toFixed(1)}%`;
}

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session || !isAllowedRole(session.role)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const params = new URL(req.url).searchParams;
  const format = (params.get("format") ?? "xlsx") as Format;
  const from = toInputDate(params.get("from"));
  const to = toInputDate(params.get("to"));
  const eventId = params.get("eventId") ?? undefined;

  const allowedFormats: Format[] = ["xlsx", "pdf", "docx"];
  if (!allowedFormats.includes(format)) {
    return NextResponse.json({ ok: false, message: "Invalid format." }, { status: 400 });
  }

  const today = new Date();
  const start = from ? startOfDay(from) : (() => { const d = new Date(today); d.setDate(d.getDate() - 30); return startOfDay(d); })();
  const end = to ? endOfDay(to) : endOfDay(today);

  try {
    const totalMembers = await prisma.member.count();

    const events = eventId
      ? await prisma.event.findMany({
          where: { id: eventId },
          select: { id: true, title: true, date: true },
        })
      : await prisma.event.findMany({
          where: { date: { gte: start, lte: end } },
          orderBy: { date: "desc" },
          select: { id: true, title: true, date: true },
        });

    const computed = await Promise.all(
      events.map(async (ev) => {
        const presentCount = await prisma.attendance.count({
          where: { eventId: ev.id, status: AttendanceStatusEnum.PRESENT },
        });
        const percent = totalMembers > 0 ? (presentCount / totalMembers) * 100 : 0;
        return {
          eventId: ev.id,
          title: ev.title,
          date: ev.date,
          presentCount,
          totalMembers,
          percent,
        };
      }),
    );

    const avg =
      computed.length > 0
        ? computed.reduce((sum, x) => sum + x.percent, 0) / computed.length
        : 0;

    if (format === "xlsx") {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Attendance Report");
      ws.columns = [
        { header: "Event Title", key: "title", width: 34 },
        { header: "Event Date", key: "date", width: 16 },
        { header: "Present", key: "present", width: 12 },
        { header: "Total Members", key: "total", width: 18 },
        { header: "Average %", key: "percent", width: 12 },
      ];
      ws.getRow(1).font = { bold: true };
      ws.addRow({
        title: "Average Attendance",
        date: "",
        present: "",
        total: "",
        percent: formatPercent(avg),
      });
      for (const r of computed) {
        ws.addRow({
          title: r.title,
          date: r.date.toLocaleDateString(),
          present: r.presentCount,
          total: r.totalMembers,
          percent: `${r.percent.toFixed(1)}%`,
        });
      }
      const buffer = await wb.xlsx.writeBuffer();
      return new NextResponse(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="attendance-report.xlsx"`,
        },
      });
    }

    if (format === "pdf") {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      page.drawText("Attendance Report", { x: 50, y: 800, size: 14, font });
      page.drawText(`Average attendance: ${avg.toFixed(1)}%`, {
        x: 50,
        y: 780,
        size: 10,
        font,
      });
      page.drawText(`Range: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`, {
        x: 50,
        y: 765,
        size: 10,
        font,
      });

      let y = 730;
      page.drawText("Event | Date | Present/Total | Percent", {
        x: 50,
        y,
        size: 10,
        font,
      });
      y -= 18;
      for (const r of computed) {
        const line = `${r.title} | ${r.date.toLocaleDateString()} | ${r.presentCount}/${r.totalMembers} | ${r.percent.toFixed(1)}%`;
        page.drawText(line, { x: 50, y, size: 9, font });
        y -= 14;
        if (y < 60) break;
      }

      const pdfBytes = await pdfDoc.save();
      return new NextResponse(Buffer.from(pdfBytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="attendance-report.pdf"`,
        },
      });
    }

    // docx
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: "Attendance Report",
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({ text: `Average attendance: ${avg.toFixed(1)}%` }),
            new Paragraph({
              text: `Range: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
            }),
            new Paragraph({ text: "" }),
            new Table({
              width: { size: 100, type: "pct" },
              columnWidths: [2600, 1500, 1600, 1600, 1200],
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph("Event Title")] }),
                    new TableCell({ children: [new Paragraph("Date")] }),
                    new TableCell({ children: [new Paragraph("Present")] }),
                    new TableCell({ children: [new Paragraph("Total")] }),
                    new TableCell({ children: [new Paragraph("Percent")] }),
                  ],
                }),
                ...computed.map(
                  (r) =>
                    new TableRow({
                      children: [
                        new TableCell({
                          children: [new Paragraph(r.title)],
                        }),
                        new TableCell({
                          children: [new Paragraph(r.date.toLocaleDateString())],
                        }),
                        new TableCell({
                          children: [new Paragraph(String(r.presentCount))],
                        }),
                        new TableCell({
                          children: [new Paragraph(String(r.totalMembers))],
                        }),
                        new TableCell({
                          children: [new Paragraph(`${r.percent.toFixed(1)}%`)],
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
        "Content-Disposition": `attachment; filename="attendance-report.docx"`,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Failed to generate report." }, { status: 500 });
  }
}


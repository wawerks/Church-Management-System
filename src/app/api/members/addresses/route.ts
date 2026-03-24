import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Escape `%`, `_`, and `\` for SQL LIKE patterns. */
function likePattern(input: string) {
  const escaped = input
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
  return `%${escaped}%`;
}

/**
 * GET ?q=... — distinct member addresses matching the query (min 2 chars).
 * Authenticated users only (same as members list).
 * Case-insensitive match (MySQL has no Prisma `mode: "insensitive"` on this provider).
 */
export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ addresses: [] as string[] });
  }

  try {
    const pattern = likePattern(q);
    const rows = await prisma.$queryRaw<Array<{ address: string }>>(
      Prisma.sql`
        SELECT DISTINCT \`address\` AS address
        FROM \`Member\`
        WHERE \`address\` IS NOT NULL
          AND TRIM(\`address\`) <> ''
          AND LOWER(\`address\`) LIKE LOWER(${pattern})
        LIMIT 20
      `,
    );

    const seen = new Set<string>();
    const addresses: string[] = [];
    for (const r of rows) {
      const a = r.address?.trim();
      if (!a) continue;
      const key = a.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      addresses.push(a);
      if (addresses.length >= 15) break;
    }

    return NextResponse.json({ addresses });
  } catch {
    return NextResponse.json({ addresses: [] as string[] });
  }
}

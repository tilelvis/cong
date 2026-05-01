import { NextResponse } from "next/server";
import { verifyToken, extractBearerToken } from "@/features/auth/lib";
import { JwtErrors } from "@alien_org/auth-client";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

const TRIALS_MAP: Record<string, number> = {
  "trials-10": 10,
  "trials-25": 27,
  "trials-50": 60,
  "trials-100": 130,
};

export async function GET(request: Request) {
  try {
    const token = extractBearerToken(request.headers.get("Authorization"));
    if (!token) {
      return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
    }

    const { sub } = await verifyToken(token);

    const result = await db.execute(sql`
      SELECT
        t.invoice,
        t.amount,
        t.token,
        t.status,
        t.created_at,
        pi.product_id
      FROM transactions t
      LEFT JOIN payment_intents pi ON pi.invoice = t.invoice
      WHERE t.sender_alien_id = ${sub}
      ORDER BY t.created_at DESC
      LIMIT 30
    `);

    const resultRows = result as unknown as any[];

    const rows = resultRows.map((row) => ({
      invoice:         row.invoice,
      amount:          row.amount,
      token:           row.token,
      status:          row.status,
      created_at:      row.created_at,
      product_id:      row.product_id ?? null,
      trials_credited: row.product_id ? (TRIALS_MAP[row.product_id] ?? null) : null,
    }));

    return NextResponse.json(rows);
  } catch (error) {
    if (error instanceof JwtErrors.JWTExpired) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
    if (error instanceof JwtErrors.JOSEError) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    console.error("Error in /api/purchase-history:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

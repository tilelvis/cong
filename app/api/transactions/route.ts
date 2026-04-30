import { NextResponse } from "next/server";
import { verifyToken, extractBearerToken } from "@/features/auth/lib";
import { JwtErrors } from "@alien_org/auth-client";
import { getTransactionsByAlienId } from "@/features/payments/queries";

export async function GET(request: Request) {
  try {
    const token = extractBearerToken(request.headers.get("Authorization"));

    if (!token) {
      return NextResponse.json(
        { error: "Missing authorization token" },
        { status: 401 },
      );
    }

    const { sub } = await verifyToken(token);
    const rows = await getTransactionsByAlienId(sub);

    const transactions = rows.map((tx) => ({
      id: tx.id,
      txHash: tx.txHash,
      status: tx.status,
      amount: tx.amount,
      token: tx.token,
      invoice: tx.invoice,
      test: tx.test,
      createdAt: tx.createdAt.toISOString(),
    }));

    return NextResponse.json({ transactions });
  } catch (error) {
    if (error instanceof JwtErrors.JWTExpired) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
    if (error instanceof JwtErrors.JOSEError) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    console.error("Error in /api/transactions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

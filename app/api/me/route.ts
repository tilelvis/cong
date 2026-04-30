import { NextResponse } from "next/server";
import { verifyToken, extractBearerToken } from "@/features/auth/lib";
import { findOrCreateUser } from "@/features/user/queries";
import { JwtErrors } from "@alien_org/auth-client";

export async function GET(request: Request) {
  try {
    const token = extractBearerToken(request.headers.get("Authorization"));

    if (!token) {
      return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
    }

    const { sub } = await verifyToken(token);
    const user = await findOrCreateUser(sub);

    return NextResponse.json({
      id: user.id,
      alienId: user.alienId,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof JwtErrors.JWTExpired) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
    if (error instanceof JwtErrors.JOSEError) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    console.error("Error in /api/me:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

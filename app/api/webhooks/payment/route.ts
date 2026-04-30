import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getServerEnv } from "@/lib/env";
import { WebhookPayload } from "@/features/payments/dto";
import { db, schema } from "@/lib/db";

async function verifySignature(
  publicKeyHex: string,
  signatureHex: string,
  body: string,
): Promise<boolean> {
  const publicKey = await crypto.subtle.importKey(
    "raw",
    Buffer.from(publicKeyHex, "hex"),
    { name: "Ed25519" },
    false,
    ["verify"],
  );

  return crypto.subtle.verify(
    "Ed25519",
    publicKey,
    Buffer.from(signatureHex, "hex"),
    Buffer.from(body),
  );
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signatureHex = request.headers.get("x-webhook-signature") ?? "";

  if (!signatureHex) {
    return NextResponse.json(
      { error: "Missing webhook signature" },
      { status: 401 },
    );
  }

  try {
    const isValid = await verifySignature(
      getServerEnv().WEBHOOK_PUBLIC_KEY,
      signatureHex,
      rawBody,
    );

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 },
      );
    }

    const parsed = WebhookPayload.safeParse(JSON.parse(rawBody));

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 },
      );
    }

    const payload = parsed.data;

    const intent = await db.query.paymentIntents.findFirst({
      where: eq(schema.paymentIntents.invoice, payload.invoice),
    });

    if (!intent) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 },
      );
    }

    if (intent.status === "completed" || intent.status === "failed") {
      return NextResponse.json({ success: true });
    }

    await db.transaction(async (tx) => {
      const newStatus = payload.status === "finalized" ? "completed" : "failed";

      await tx
        .update(schema.paymentIntents)
        .set({ status: newStatus })
        .where(eq(schema.paymentIntents.invoice, payload.invoice));

      await tx.insert(schema.transactions).values({
        senderAlienId: intent.senderAlienId,
        recipientAddress: payload.recipient,
        txHash: payload.txHash ?? null,
        status: payload.status === "finalized" ? "paid" : "failed",
        amount: intent.amount,
        token: intent.token,
        network: intent.network,
        invoice: payload.invoice,
        test: payload.test ? "true" : null,
        payload,
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 },
    );
  }
}

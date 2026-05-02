import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getServerEnv } from "@/lib/env";
import { WebhookPayload } from "@/features/payments/dto";
import { db } from "@/lib/db";

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
    return NextResponse.json({ error: "Missing webhook signature" }, { status: 401 });
  }

  try {
    const isValid = await verifySignature(
      getServerEnv().WEBHOOK_PUBLIC_KEY,
      signatureHex,
      rawBody,
    );

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const parsed = WebhookPayload.safeParse(JSON.parse(rawBody));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const payload = parsed.data;

    const intentResult = (await db.execute(sql`
      SELECT * FROM payment_intents WHERE invoice = ${payload.invoice}
    `)) as any;

    if (!intentResult.rows || intentResult.rows.length === 0) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const intent = intentResult.rows[0];

    if (intent.status === "completed" || intent.status === "failed") {
      return NextResponse.json({ success: true });
    }

    await db.transaction(async (tx) => {
      const newStatus = payload.status === "finalized" ? "completed" : "failed";

      await tx.execute(sql`
        UPDATE payment_intents SET status = ${newStatus} WHERE invoice = ${payload.invoice}
      `);

      await tx.execute(sql`
        INSERT INTO transactions (
          sender_alien_id, recipient_address, tx_hash, status, amount, token, network, invoice, test, payload
        ) VALUES (
          ${intent.sender_alien_id}, ${payload.recipient}, ${payload.txHash ?? null},
          ${payload.status === "finalized" ? "paid" : "failed"},
          ${intent.amount}, ${intent.token}, ${intent.network}, ${payload.invoice},
          ${payload.test ? "true" : null}, ${JSON.stringify(payload)}
        )
      `);

      if (payload.status === "finalized") {
        const trialsMap: Record<string, number> = {
          "trials-10": 10,
          "trials-25": 27,
          "trials-50": 60,
          "trials-100": 130,
        };
        const trialsToAdd = trialsMap[intent.product_id ?? ""] ?? 0;

        if (trialsToAdd > 0) {
          await tx.execute(sql`
            INSERT INTO game_wallets (alien_id, trials, total_purchased)
            VALUES (${intent.sender_alien_id}, ${trialsToAdd}, ${trialsToAdd})
            ON CONFLICT (alien_id) DO UPDATE SET
              trials          = game_wallets.trials + ${trialsToAdd},
              total_purchased = game_wallets.total_purchased + ${trialsToAdd},
              updated_at      = NOW()
          `);
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
  }
}

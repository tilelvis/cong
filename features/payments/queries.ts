import { eq, desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { PaymentIntent, Transaction } from "@/lib/db/schema";

export async function createPaymentIntent(data: {
  invoice: string;
  senderAlienId: string;
  recipientAddress: string;
  amount: string;
  token: string;
  network: string;
  productId: string | null;
}): Promise<PaymentIntent> {
  const [intent] = await db
    .insert(schema.paymentIntents)
    .values(data)
    .returning();
  return intent;
}

export async function findPaymentIntentByInvoice(
  invoice: string,
): Promise<PaymentIntent | undefined> {
  return db.query.paymentIntents.findFirst({
    where: eq(schema.paymentIntents.invoice, invoice),
  });
}

export async function markPaymentIntentCompleted(invoice: string) {
  await db
    .update(schema.paymentIntents)
    .set({ status: "completed" })
    .where(eq(schema.paymentIntents.invoice, invoice));
}

export async function markPaymentIntentFailed(invoice: string) {
  await db
    .update(schema.paymentIntents)
    .set({ status: "failed" })
    .where(eq(schema.paymentIntents.invoice, invoice));
}

export async function createTransaction(data: {
  senderAlienId: string | null;
  recipientAddress: string;
  txHash: string | null;
  status: string;
  amount: string | null;
  token: string | null;
  network: string | null;
  invoice: string | null;
  test: string | null;
  payload: unknown;
}): Promise<Transaction> {
  const [tx] = await db.insert(schema.transactions).values(data).returning();
  return tx;
}

export async function getTransactionsByAlienId(
  alienId: string,
  limit = 50,
): Promise<Transaction[]> {
  return db.query.transactions.findMany({
    where: eq(schema.transactions.senderAlienId, alienId),
    orderBy: desc(schema.transactions.createdAt),
    limit,
  });
}

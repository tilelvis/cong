import { z } from "zod";
import type { PaymentTestScenario } from "@alien_org/contract";

export const CreateInvoiceRequest = z.object({
  productId: z.string().min(1),
});

export type CreateInvoiceRequest = z.infer<typeof CreateInvoiceRequest>;

export const CreateInvoiceResponse = z.object({
  invoice: z.string(),
  id: z.string(),
  recipient: z.string(),
  amount: z.string(),
  token: z.string(),
  network: z.string(),
  item: z.object({
    title: z.string(),
    iconUrl: z.string(),
    quantity: z.number(),
  }),
  test: z.string().optional().transform((val) => val as PaymentTestScenario | undefined),
});

export type CreateInvoiceResponse = z.infer<typeof CreateInvoiceResponse>;

export const WebhookPayload = z.object({
  invoice: z.string(),
  recipient: z.string(),
  txHash: z.string().optional(),
  status: z.enum(["finalized", "failed"]),
  amount: z.string(),
  token: z.string().optional(),
  network: z.string().optional(),
  test: z.boolean().optional(),
});

export type WebhookPayload = z.infer<typeof WebhookPayload>;

export const TransactionDTO = z.object({
  id: z.string(),
  txHash: z.string().nullable(),
  status: z.string(),
  amount: z.string().nullable(),
  token: z.string().nullable(),
  invoice: z.string().nullable(),
  test: z.string().nullable(),
  createdAt: z.string(),
});

export type TransactionDTO = z.infer<typeof TransactionDTO>;

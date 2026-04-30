"use client";

import { useCallback } from "react";
import { useAlien, usePayment } from "@alien_org/react";
import type { CreateInvoiceResponse } from "../dto";

type UseDiamondPurchaseOptions = {
  onPaid?: () => void;
  onCancelled?: () => void;
  onFailed?: () => void;
};

export function useDiamondPurchase({
  onPaid,
  onCancelled,
  onFailed,
}: UseDiamondPurchaseOptions) {
  const { authToken } = useAlien();

  const payment = usePayment({
    onPaid,
    onCancelled,
    onFailed,
  });

  const purchase = useCallback(
    async (productId: string) => {
      if (!authToken) return;

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ productId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to create invoice");
      }

      const data: CreateInvoiceResponse = await res.json();

      payment.pay({
        recipient: data.recipient,
        amount: data.amount,
        token: data.token,
        network: data.network,
        invoice: data.invoice,
        item: data.item,
        test: data.test,
      });
    },
    [authToken, payment],
  );

  return {
    purchase,
    status: payment.status,
    isLoading: payment.isLoading,
    isPaid: payment.isPaid,
    isCancelled: payment.isCancelled,
    isFailed: payment.isFailed,
    txHash: payment.txHash,
    error: payment.error,
    errorCode: payment.errorCode,
    reset: payment.reset,
    supported: payment.supported,
  };
}

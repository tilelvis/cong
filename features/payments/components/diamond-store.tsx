"use client";

import { useState, useCallback, useRef } from "react";
import { useAlien } from "@alien_org/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  DIAMOND_PRODUCTS,
  TEST_DIAMOND_PRODUCTS,
  type DiamondProduct,
} from "../constants";
import { useDiamondPurchase } from "../hooks/use-diamond-purchase";
import { TransactionDTO } from "../dto";

type Tab = "real" | "test";

async function fetchTransactions(authToken: string): Promise<TransactionDTO[]> {
  const res = await fetch("/api/transactions", {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch transactions");
  const data = await res.json();
  return data.transactions;
}

const TOKEN_DECIMALS: Record<string, number> = {
  USDC: 6,
  SOL: 9,
  ALIEN: 9,
};

function formatAmount(rawAmount: string, token: string): string {
  const decimals = TOKEN_DECIMALS[token] ?? 9;
  const whole = rawAmount.padStart(decimals + 1, "0");
  const intPart = whole.slice(0, -decimals);
  const fracPart = whole.slice(-decimals).replace(/0+$/, "");
  const formatted = fracPart ? `${intPart}.${fracPart}` : intPart;
  return `${formatted} ${token}`;
}

function DiamondIcon({ count }: { count: number }) {
  if (count <= 10) return <span className="text-3xl">💎</span>;
  if (count <= 50)
    return (
      <span className="text-3xl">
        💎<span className="text-lg">💎</span>
      </span>
    );
  if (count <= 150)
    return (
      <span className="text-2xl">
        💎💎<span className="text-lg">💎</span>
      </span>
    );
  return <span className="text-2xl">💎💎💎💎</span>;
}

function TabSwitch({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
}) {
  return (
    <div className="flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800">
      <button
        onClick={() => onChange("real")}
        className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
          active === "real"
            ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
            : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        }`}
      >
        Real Payments
      </button>
      <button
        onClick={() => onChange("test")}
        className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
          active === "test"
            ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
            : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        }`}
      >
        Test Payments
      </button>
    </div>
  );
}

function ProductCard({
  product,
  onBuy,
  disabled,
}: {
  product: DiamondProduct;
  onBuy: (product: DiamondProduct) => void;
  disabled: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200/60 bg-white dark:border-zinc-800/60 dark:bg-zinc-900">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
            <DiamondIcon count={product.diamonds} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {product.diamonds} Diamonds
              </h3>
              {product.test && (
                <span className="inline-flex rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  TEST
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {product.name} — {product.description}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            {product.price}
          </span>
          <button
            onClick={() => onBuy(product)}
            disabled={disabled}
            className="rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Buy
          </button>
        </div>
      </div>
    </div>
  );
}

function TransactionItem({ tx }: { tx: TransactionDTO }) {
  const statusStyles: Record<string, string> = {
    paid: "text-emerald-600 dark:text-emerald-400",
    finalized: "text-emerald-600 dark:text-emerald-400",
    failed: "text-red-500 dark:text-red-400",
    cancelled: "text-zinc-400 dark:text-zinc-500",
  };

  const amount =
    tx.amount && tx.token ? formatAmount(tx.amount, tx.token) : "—";

  return (
    <div className="rounded-lg border border-zinc-100 px-3 py-2.5 dark:border-zinc-800/50">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {amount}
        </span>
        <span
          className={`text-xs font-medium ${statusStyles[tx.status] ?? "text-zinc-400"}`}
        >
          {tx.status}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between">
        {tx.invoice && (
          <span className="max-w-[200px] truncate text-[11px] text-zinc-400">
            {tx.invoice}
          </span>
        )}
        {tx.test && (
          <span className="text-[10px] font-medium text-amber-500">TEST</span>
        )}
      </div>
      <p className="mt-0.5 text-[11px] text-zinc-400">
        {new Date(tx.createdAt).toLocaleString()}
      </p>
    </div>
  );
}

export function DiamondStore() {
  const { authToken, isBridgeAvailable } = useAlien();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("real");
  const activeProductRef = useRef<DiamondProduct | null>(null);

  const {
    data: transactions,
    isLoading: loadingTxs,
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => fetchTransactions(authToken!),
    enabled: !!authToken,
  });

  const handlePaid = useCallback(() => {
    const product = activeProductRef.current;
    if (product) {
      toast.success(
        `Bought ${product.diamonds} diamonds for ${product.price}`,
      );
    }
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  }, [queryClient]);

  const handleCancelled = useCallback(() => {
    const product = activeProductRef.current;
    toast(
      product
        ? `Purchase of ${product.diamonds} diamonds cancelled`
        : "Payment cancelled",
      { icon: "\u2715" },
    );
  }, []);

  const handleFailed = useCallback(() => {
    const product = activeProductRef.current;
    toast.error(
      product
        ? `Failed to buy ${product.diamonds} diamonds for ${product.price}`
        : "Payment failed. Please try again.",
    );
  }, []);

  const {
    purchase,
    isLoading,
    reset,
  } = useDiamondPurchase({
    onPaid: handlePaid,
    onCancelled: handleCancelled,
    onFailed: handleFailed,
  });

  const handleBuy = async (product: DiamondProduct) => {
    activeProductRef.current = product;
    try {
      await purchase(product.id);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to initiate payment",
      );
    }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    reset();
  };

  const products =
    activeTab === "test" ? TEST_DIAMOND_PRODUCTS : DIAMOND_PRODUCTS;
  const canBuy = !!authToken && isBridgeAvailable && !isLoading;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Diamond Store
        </h1>
        <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
          Purchase diamond packs with USDC or ALIEN.
        </p>
      </div>

      {!isBridgeAvailable && (
        <div className="rounded-xl border border-amber-200/60 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-950/20">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Open this app inside the Alien app to enable payments.
          </p>
        </div>
      )}

      <TabSwitch active={activeTab} onChange={handleTabChange} />

      <div className="flex flex-col gap-3">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onBuy={handleBuy}
            disabled={!canBuy}
          />
        ))}
      </div>

      {isLoading && (
        <p className="text-center text-sm text-zinc-400">
          Processing payment...
        </p>
      )}

      {authToken && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              Transaction History
            </h2>
            <button
              onClick={() => refetchTransactions()}
              disabled={loadingTxs}
              className="text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            >
              {loadingTxs ? "Loading..." : "Refresh"}
            </button>
          </div>

          {!transactions?.length ? (
            <p className="py-6 text-center text-sm text-zinc-400">
              No transactions yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {transactions.map((tx) => (
                <TransactionItem key={tx.id} tx={tx} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

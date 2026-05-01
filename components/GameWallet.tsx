"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useAlien, usePayment } from "@alien_org/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DepositPack {
  id: string;
  name: string;
  trials: number;
  price: string;
  amount: string;
  token: string;
  network: string;
}

// ── GameWallet ─────────────────────────────────────────────────────────────────

export function GameWallet() {
  const { authToken, isBridgeAvailable } = useAlien();
  const queryClient = useQueryClient();
  const activePack = useRef<DepositPack | null>(null);
  const [polling, setPolling] = useState(false);

  const { data: packs, isLoading: packsLoading } = useQuery<DepositPack[]>({
    queryKey: ["deposit-packs"],
    queryFn: async () => {
      const res = await fetch("/api/game-wallet", { headers: { Authorization: `Bearer ${authToken!}` } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!authToken,
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["purchase-history"],
    queryFn: async () => {
      const res = await fetch("/api/purchase-history", { headers: { Authorization: `Bearer ${authToken!}` } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!authToken,
  });

  const onPaid = useCallback(() => {
    const pack = activePack.current;
    if (pack) toast.success(`+${pack.trials} trials credited`, { icon: "⬡" });
    queryClient.invalidateQueries({ queryKey: ["wallet"] });
    queryClient.invalidateQueries({ queryKey: ["purchase-history"] });
  }, [queryClient]);

  const onCancelled = useCallback(() => {
    toast("Mission payment cancelled", { icon: "✕" });
  }, []);

  const onFailed = useCallback(() => {
    toast.error("Payment failed. Try again.");
  }, []);

  const { pay, isLoading: payLoading } = usePayment({ onPaid, onCancelled, onFailed });

  const handleBuy = async (pack: DepositPack) => {
    if (!authToken) return;
    activePack.current = pack;

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ productId: pack.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to initiate payment");
        return;
      }
      const data = await res.json();
      pay({
        recipient: data.recipient,
        amount: data.amount,
        token: data.token,
        network: data.network,
        invoice: data.invoice,
        item: data.item,
        ...(data.test ? { test: data.test } : {}),
      });
    } catch {
      toast.error("Connection failure.");
    }
  };

  const packIcons = (trials: number) => {
    if (trials <= 10) return "◈";
    if (trials <= 27) return "◈◈";
    if (trials <= 60) return "◈◈◈";
    return "◈◈◈◈";
  };

  return (
    <div className="px-4 py-6 pb-28 space-y-5">
      {/* Header */}
      <div className="text-center">
        <div style={{ fontFamily: "var(--font-display)" }} className="text-[var(--alien-plasma)] text-xl font-black uppercase tracking-[0.2em] glow-plasma">
          ◈ TRIAL DEPOT
        </div>
        <div style={{ fontFamily: "var(--font-mono)" }} className="text-[var(--alien-text-muted)] text-[10px] tracking-[0.25em] mt-1 uppercase">
          PURCHASE MISSION CREDITS
        </div>
      </div>

      {/* Bridge warning */}
      {!isBridgeAvailable && (
        <div className="hud-card p-4 border-[var(--alien-warning)] flex items-start gap-3" style={{ borderColor: "var(--alien-warning)" }}>
          <span className="text-[var(--alien-warning)] text-lg shrink-0">⚠</span>
          <div>
            <div style={{ fontFamily: "var(--font-mono)" }} className="text-[var(--alien-warning)] text-xs uppercase tracking-widest mb-1">BRIDGE OFFLINE</div>
            <div style={{ fontFamily: "var(--font-body)" }} className="text-[var(--alien-text-dim)] text-sm">Open inside the Alien app to enable payments.</div>
          </div>
        </div>
      )}

      {/* Packs */}
      <div>
        <div style={{ fontFamily: "var(--font-mono)" }} className="text-[var(--alien-text-muted)] text-[9px] tracking-[0.35em] uppercase mb-3">
          // SELECT TRIAL PACK
        </div>
        <div className="space-y-2">
          {packsLoading ? (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="hud-card p-4 h-16 animate-pulse" />
            ))
          ) : (
            (packs ?? []).map((pack) => (
              <button
                key={pack.id}
                onClick={() => handleBuy(pack)}
                disabled={payLoading || !isBridgeAvailable || !authToken}
                className="w-full hud-card p-4 flex items-center gap-4 hover:border-[var(--alien-border-glow)] hover:bg-[#00f0ff06] transition-all duration-200 group disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]"
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--alien-plasma)",
                    fontSize: "20px",
                    filter: "drop-shadow(0 0 8px var(--alien-plasma))",
                    minWidth: "40px",
                    textAlign: "center",
                  }}
                >
                  {packIcons(pack.trials)}
                </div>
                <div className="flex-1 text-left">
                  <div
                    style={{ fontFamily: "var(--font-display)", fontSize: "13px" }}
                    className="text-[var(--alien-text)] uppercase tracking-widest group-hover:text-[var(--alien-plasma)] group-hover:glow-plasma transition-all duration-200"
                  >
                    {pack.trials} TRIALS
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)" }} className="text-[var(--alien-text-muted)] text-xs mt-0.5">
                    {pack.name} · {pack.token}
                  </div>
                </div>
                <div style={{ fontFamily: "var(--font-display)", color: "var(--alien-energy)" }} className="text-sm font-bold glow-energy shrink-0">
                  {pack.price}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {payLoading && (
        <div className="hud-card p-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[var(--alien-plasma)] alien-pulse" style={{ boxShadow: "0 0 6px var(--alien-plasma)" }} />
          <span style={{ fontFamily: "var(--font-mono)" }} className="text-[var(--alien-plasma)] text-xs tracking-widest uppercase">
            PROCESSING PAYMENT...
          </span>
        </div>
      )}

      {/* Purchase history */}
      {authToken && (
        <div className="hud-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[var(--alien-border)] flex items-center gap-2">
            <span className="text-[var(--alien-plasma)] text-sm">◌</span>
            <span style={{ fontFamily: "var(--font-mono)" }} className="text-[var(--alien-text-dim)] text-[9px] tracking-[0.25em] uppercase">
              ACQUISITION LOG
            </span>
          </div>

          {historyLoading ? (
            <div className="p-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-10 animate-pulse border-b border-[var(--alien-border)] last:border-0" />
              ))}
            </div>
          ) : !history?.length ? (
            <div className="px-4 py-6 text-center">
              <span style={{ fontFamily: "var(--font-mono)" }} className="text-[var(--alien-text-muted)] text-xs uppercase tracking-widest">
                NO TRANSACTIONS ON RECORD
              </span>
            </div>
          ) : (
            (history as Array<{ invoice: string; amount: string; token: string; status: string; created_at: string; trials_credited: number | null }>).map((item) => (
              <div key={item.invoice} className="px-4 py-2.5 flex items-center gap-3 border-b border-[var(--alien-border)] last:border-0">
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    background: item.status === "paid" ? "var(--alien-energy)" : item.status === "failed" ? "var(--alien-danger)" : "var(--alien-text-muted)",
                    boxShadow: item.status === "paid" ? "0 0 4px var(--alien-energy)" : "none",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div style={{ fontFamily: "var(--font-mono)" }} className="text-[var(--alien-text)] text-xs truncate">
                    {item.trials_credited ? `+${item.trials_credited} trials` : item.amount}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)" }} className="text-[var(--alien-text-muted)] text-[9px] mt-0.5">
                    {new Date(item.created_at).toLocaleDateString()} · {item.token}
                  </div>
                </div>
                <span
                  style={{ fontFamily: "var(--font-mono)" }}
                  className={`text-[9px] uppercase tracking-widest shrink-0 ${
                    item.status === "paid" ? "text-[var(--alien-energy)] glow-energy" :
                    item.status === "failed" ? "text-[var(--alien-danger)]" :
                    "text-[var(--alien-text-muted)]"
                  }`}
                >
                  {item.status}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

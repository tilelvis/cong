"use client";

import { useCallback, useRef } from "react";
import { useAlien, usePayment } from "@alien_org/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DEPOSIT_PACKS } from "@/lib/deposit-packs";
import toast from "react-hot-toast";

type DepositPack = typeof DEPOSIT_PACKS[number];

export default function StorePage() {
  const { authToken, isBridgeAvailable } = useAlien();
  const queryClient = useQueryClient();
  const activePack = useRef<DepositPack | null>(null);

  const { data: wallet } = useQuery({
    queryKey: ["wallet"],
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
    if (pack) toast.success(`+${pack.trials} trials incoming!`, { icon: "⚡" });
    let attempts = 0;
    const poll = setInterval(() => {
      attempts++;
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-history"] });
      if (attempts >= 15) clearInterval(poll);
    }, 2000);
  }, [queryClient]);

  const { pay, isLoading: payLoading } = usePayment({
    onPaid,
    onCancelled: () => toast("Payment cancelled", { icon: "✕" }),
    onFailed: () => toast.error("Payment failed. Try again."),
  });

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
        toast.error(err.error ?? "Failed to create invoice");
        return;
      }
      const data = await res.json();
      pay({ recipient: data.recipient, amount: data.amount, token: data.token, network: data.network, invoice: data.invoice, item: data.item, ...(data.test ? { test: data.test } : {}) });
    } catch {
      toast.error("Connection failure.");
    }
  };

  const trials = wallet?.trials ?? 0;

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden", padding: "0 16px", paddingBottom: 72 }}>

      {/* Header */}
      <div style={{ paddingTop: 20, paddingBottom: 12, flexShrink: 0, textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: "0.2em" }}
          className="text-[var(--alien-plasma)] glow-plasma uppercase font-black">
          ⚡ TRIAL DEPOT
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.25em" }}
          className="text-[var(--alien-text-muted)] uppercase mt-1">
          PURCHASE MISSION CREDITS
        </div>
      </div>

      {/* Balance */}
      <div className="hud-card shrink-0" style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }} className="text-[var(--alien-text-muted)] uppercase tracking-widest">AVAILABLE TRIALS</span>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 24 }} className="text-[var(--alien-energy)] glow-energy font-black">{trials}</span>
      </div>

      {/* Bridge warning */}
      {!isBridgeAvailable && (
        <div className="hud-card shrink-0" style={{ padding: 12, marginBottom: 12, borderColor: "var(--alien-warning)", display: "flex", gap: 10 }}>
          <span className="text-[var(--alien-warning)]">⚠</span>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13 }} className="text-[var(--alien-text-dim)]">
            Open inside the Alien app to enable payments.
          </span>
        </div>
      )}

      {/* Pack list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12, flexShrink: 0 }}>
        {DEPOSIT_PACKS.map(pack => (
          <button
            key={pack.id}
            onClick={() => handleBuy(pack)}
            disabled={payLoading || !isBridgeAvailable || !authToken}
            className="hud-card w-full hover:border-[var(--alien-border-glow)] hover:bg-[#00f0ff06] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]"
            style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}
          >
            <span style={{ fontSize: 28 }}>⚡</span>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 15 }} className="text-[var(--alien-text)] uppercase tracking-widest">
                {pack.trials} TRIALS
                {pack.bonus && <span style={{ fontSize: 10, marginLeft: 8 }} className="text-[var(--alien-energy)]">{pack.bonus}</span>}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11 }} className="text-[var(--alien-text-muted)] mt-0.5">
                {Number(pack.amount) / 1e9} ALIEN
              </div>
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 14 }} className="text-[var(--alien-energy)] glow-energy font-bold shrink-0">
              {Number(pack.amount) / 1e9} ALN
            </div>
          </button>
        ))}
      </div>

      {payLoading && (
        <div className="hud-card shrink-0" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div className="w-2 h-2 rounded-full bg-[var(--alien-plasma)] alien-pulse" style={{ boxShadow: "0 0 6px var(--alien-plasma)" }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }} className="text-[var(--alien-plasma)] uppercase tracking-widest">
            PROCESSING PAYMENT...
          </span>
        </div>
      )}

      {/* Purchase history */}
      <div className="hud-card overflow-hidden" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--alien-border)", flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9 }} className="text-[var(--alien-text-dim)] uppercase tracking-[0.25em]">
            📋 ACQUISITION LOG
          </span>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {historyLoading ? (
            <div style={{ padding: 16 }}>
              {[1,2].map(i => <div key={i} className="h-10 animate-pulse border-b border-[var(--alien-border)]" />)}
            </div>
          ) : !(history as any[])?.length ? (
            <div style={{ padding: 24, textAlign: "center" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }} className="text-[var(--alien-text-muted)] uppercase tracking-widest">
                NO TRANSACTIONS ON RECORD
              </span>
            </div>
          ) : (
            (history as Array<{ invoice: string; amount: string; token: string; status: string; created_at: string; trials_credited: number | null }>).map(item => (
              <div key={item.invoice} style={{ padding: "10px 16px", borderBottom: "1px solid var(--alien-border)", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: item.status === "paid" ? "var(--alien-energy)" : item.status === "failed" ? "var(--alien-danger)" : "var(--alien-text-muted)", boxShadow: item.status === "paid" ? "0 0 4px var(--alien-energy)" : "none" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12 }} className="text-[var(--alien-text)] truncate">
                    {item.trials_credited ? `+${item.trials_credited} trials` : `${Number(item.amount) / 1e9} ALIEN`}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9 }} className="text-[var(--alien-text-muted)] mt-0.5">
                    {new Date(item.created_at).toLocaleDateString()}
                  </div>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9 }}
                  className={`uppercase tracking-widest shrink-0 ${item.status === "paid" ? "text-[var(--alien-energy)] glow-energy" : item.status === "failed" ? "text-[var(--alien-danger)]" : "text-[var(--alien-text-muted)]"}`}>
                  {item.status === "paid" ? "✓ PAID" : item.status.toUpperCase()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

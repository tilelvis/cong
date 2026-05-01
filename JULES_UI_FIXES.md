# UI FIXES — EMPTY SPACE, GRID SIZE, TAB BAR, GET TRIALS
# 4 files to change. Nothing else.

---

## FIX 1 — `features/navigation/components/tab-bar.tsx`
# Change icons to emoji and labels to plain English words.
# Fix the /store route label so it reads "TRIALS" not a symbol.

Replace the tabs array at the top of the file:

Find:
```ts
const tabs = [
  { href: "/", icon: "⬡", label: "OPS" },
  { href: "/store", icon: "◈", label: "DEPOT" },
  { href: "/history", icon: "◌", label: "INTEL" },
];
```

Replace with:
```ts
const tabs = [
  { href: "/", icon: "🎮", label: "PLAY" },
  { href: "/store", icon: "⚡", label: "TRIALS" },
  { href: "/history", icon: "📋", label: "HISTORY" },
];
```

---

## FIX 2 — `app/store/page.tsx`
# The store page is broken because GameWallet calls /api/game-wallet
# expecting deposit packs but that route returns wallet balance.
# Replace the entire file so it uses the correct deposit packs from lib/deposit-packs.ts

```tsx
"use client";

import { useState, useCallback, useRef } from "react";
import { useAlien, usePayment } from "@alien_org/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { DEPOSIT_PACKS } from "@/lib/deposit-packs";

export default function StorePage() {
  const { authToken, isBridgeAvailable } = useAlien();
  const queryClient = useQueryClient();
  const activePack = useRef<typeof DEPOSIT_PACKS[number] | null>(null);

  const { data: walletData } = useQuery({
    queryKey: ["wallet"],
    queryFn: async () => {
      const res = await fetch("/api/game-wallet", {
        headers: { Authorization: `Bearer ${authToken!}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!authToken,
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["purchase-history"],
    queryFn: async () => {
      const res = await fetch("/api/purchase-history", {
        headers: { Authorization: `Bearer ${authToken!}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!authToken,
  });

  const onPaid = useCallback(() => {
    const pack = activePack.current;
    if (pack) toast.success(`+${pack.trials} trials credited!`, { icon: "⚡" });
    // Poll wallet for 30s to catch webhook
    let attempts = 0;
    const poll = setInterval(() => {
      attempts++;
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-history"] });
      if (attempts >= 15) clearInterval(poll);
    }, 2000);
  }, [queryClient]);

  const onCancelled = useCallback(() => {
    toast("Payment cancelled", { icon: "✕" });
  }, []);

  const onFailed = useCallback(() => {
    toast.error("Payment failed. Try again.");
  }, []);

  const { pay, isLoading: payLoading } = usePayment({ onPaid, onCancelled, onFailed });

  const handleBuy = async (pack: typeof DEPOSIT_PACKS[number]) => {
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

  const trials = walletData?.trials ?? 0;

  return (
    <div className="px-4 py-6 pb-28 space-y-5">
      {/* Header */}
      <div className="text-center pt-4">
        <div style={{ fontFamily: "var(--font-display)" }}
          className="text-[var(--alien-plasma)] text-2xl font-black uppercase tracking-[0.2em] glow-plasma">
          ⚡ TRIAL DEPOT
        </div>
        <div style={{ fontFamily: "var(--font-mono)" }}
          className="text-[var(--alien-text-muted)] text-[10px] tracking-[0.25em] mt-1 uppercase">
          PURCHASE MISSION CREDITS
        </div>
      </div>

      {/* Current balance */}
      <div className="hud-card p-4 flex items-center justify-between">
        <span style={{ fontFamily: "var(--font-mono)" }}
          className="text-[var(--alien-text-dim)] text-xs uppercase tracking-widest">
          CURRENT TRIALS
        </span>
        <span style={{ fontFamily: "var(--font-display)" }}
          className="text-[var(--alien-energy)] text-2xl font-black glow-energy">
          {trials}
        </span>
      </div>

      {/* Bridge warning */}
      {!isBridgeAvailable && (
        <div className="hud-card p-4 flex items-start gap-3"
          style={{ borderColor: "var(--alien-warning)" }}>
          <span className="text-[var(--alien-warning)] text-lg shrink-0">⚠</span>
          <div>
            <div style={{ fontFamily: "var(--font-mono)" }}
              className="text-[var(--alien-warning)] text-xs uppercase tracking-widest mb-1">
              BRIDGE OFFLINE
            </div>
            <div style={{ fontFamily: "var(--font-body)" }}
              className="text-[var(--alien-text-dim)] text-sm">
              Open inside the Alien app to enable payments.
            </div>
          </div>
        </div>
      )}

      {/* Packs */}
      <div>
        <div style={{ fontFamily: "var(--font-mono)" }}
          className="text-[var(--alien-text-muted)] text-[9px] tracking-[0.35em] uppercase mb-3">
          // SELECT TRIAL PACK
        </div>
        <div className="space-y-2">
          {DEPOSIT_PACKS.map((pack) => (
            <button
              key={pack.id}
              onClick={() => handleBuy(pack)}
              disabled={payLoading || !isBridgeAvailable || !authToken}
              className="w-full hud-card p-4 flex items-center gap-4 hover:border-[var(--alien-border-glow)] hover:bg-[#00f0ff06] transition-all duration-200 group disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]"
            >
              <div style={{ fontFamily: "var(--font-display)", color: "var(--alien-plasma)", fontSize: "22px", filter: "drop-shadow(0 0 8px var(--alien-plasma))", minWidth: "40px", textAlign: "center" }}>
                ⚡
              </div>
              <div className="flex-1 text-left">
                <div style={{ fontFamily: "var(--font-display)", fontSize: "14px" }}
                  className="text-[var(--alien-text)] uppercase tracking-widest group-hover:text-[var(--alien-plasma)] transition-colors">
                  {pack.trials} TRIALS
                  {pack.bonus && (
                    <span style={{ fontSize: "10px" }}
                      className="ml-2 text-[var(--alien-energy)] glow-energy">
                      {pack.bonus}
                    </span>
                  )}
                </div>
                <div style={{ fontFamily: "var(--font-mono)" }}
                  className="text-[var(--alien-text-muted)] text-xs mt-0.5">
                  {Number(pack.amount) / 1e9} ALIEN
                </div>
              </div>
              <div style={{ fontFamily: "var(--font-display)", color: "var(--alien-energy)" }}
                className="text-sm font-bold glow-energy shrink-0">
                {Number(pack.amount) / 1e9} ALN
              </div>
            </button>
          ))}
        </div>
      </div>

      {payLoading && (
        <div className="hud-card p-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[var(--alien-plasma)] alien-pulse"
            style={{ boxShadow: "0 0 6px var(--alien-plasma)" }} />
          <span style={{ fontFamily: "var(--font-mono)" }}
            className="text-[var(--alien-plasma)] text-xs tracking-widest uppercase">
            PROCESSING PAYMENT...
          </span>
        </div>
      )}

      {/* Purchase history */}
      <div className="hud-card overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[var(--alien-border)] flex items-center gap-2">
          <span className="text-[var(--alien-plasma)] text-sm">📋</span>
          <span style={{ fontFamily: "var(--font-mono)" }}
            className="text-[var(--alien-text-dim)] text-[9px] tracking-[0.25em] uppercase">
            ACQUISITION LOG
          </span>
        </div>
        {historyLoading ? (
          <div className="p-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-10 animate-pulse border-b border-[var(--alien-border)] last:border-0" />
            ))}
          </div>
        ) : !(history as any[])?.length ? (
          <div className="px-4 py-6 text-center">
            <span style={{ fontFamily: "var(--font-mono)" }}
              className="text-[var(--alien-text-muted)] text-xs uppercase tracking-widest">
              NO TRANSACTIONS ON RECORD
            </span>
          </div>
        ) : (
          (history as Array<{ invoice: string; amount: string; token: string; status: string; created_at: string; trials_credited: number | null }>).map((item) => (
            <div key={item.invoice}
              className="px-4 py-2.5 flex items-center gap-3 border-b border-[var(--alien-border)] last:border-0">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{
                background: item.status === "paid" ? "var(--alien-energy)" : item.status === "failed" ? "var(--alien-danger)" : "var(--alien-text-muted)",
                boxShadow: item.status === "paid" ? "0 0 4px var(--alien-energy)" : "none",
              }} />
              <div className="flex-1 min-w-0">
                <div style={{ fontFamily: "var(--font-mono)" }}
                  className="text-[var(--alien-text)] text-xs truncate">
                  {item.trials_credited ? `+${item.trials_credited} trials` : `${Number(item.amount) / 1e9} ALIEN`}
                </div>
                <div style={{ fontFamily: "var(--font-mono)" }}
                  className="text-[var(--alien-text-muted)] text-[9px] mt-0.5">
                  {new Date(item.created_at).toLocaleDateString()}
                </div>
              </div>
              <span style={{ fontFamily: "var(--font-mono)" }}
                className={`text-[9px] uppercase tracking-widest shrink-0 ${
                  item.status === "paid" ? "text-[var(--alien-energy)] glow-energy" :
                  item.status === "failed" ? "text-[var(--alien-danger)]" :
                  "text-[var(--alien-text-muted)]"
                }`}>
                {item.status === "paid" ? "✓ PAID" : item.status.toUpperCase()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

---

## FIX 3 — `components/GameBoard.tsx`
# Make the grid fill the full screen width instead of being capped at 320px.
# Remove the empty space below the board by making the layout flex-fill.

Find this line:
```ts
  const cellSize = Math.floor(320 / n);
```
Replace with:
```ts
  const cellSize = Math.floor(Math.min(
    typeof window !== 'undefined' ? window.innerWidth - 24 : 370,
    390
  ) / n);
```

Find the outer wrapper div of the GameBoard return:
```tsx
  return (
    <div className="flex flex-col items-center px-3 py-4 gap-4">
```
Replace with:
```tsx
  return (
    <div className="flex flex-col items-center px-2 py-2 gap-3 w-full">
```

Find the grid container:
```tsx
      <div
        className="hud-card overflow-hidden"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${n}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${n}, ${cellSize}px)`,
          gap: 0,
          boxShadow: "0 0 0 1px var(--alien-border-glow), 0 0 30px #00f0ff10, inset 0 0 30px #00f0ff06",
        }}
      >
```
Replace with:
```tsx
      <div
        className="hud-card overflow-hidden w-full"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${n}, 1fr)`,
          gridTemplateRows: `repeat(${n}, ${cellSize}px)`,
          gap: 0,
          boxShadow: "0 0 0 1px var(--alien-border-glow), 0 0 30px #00f0ff10, inset 0 0 30px #00f0ff06",
        }}
      >
```

Also update each cell button to fill its grid column:
Find inside the cell button style:
```ts
                  width: cellSize,
                  height: cellSize,
```
Replace with:
```ts
                  width: "100%",
                  height: cellSize,
```

---

## FIX 4 — `app/page.tsx`
# Remove `pb-28` (tab bar padding) from the playing screen wrapper
# since the board needs all available space.
# Also add a GET TRIALS button next to LAUNCH MISSION.

Find the playing screen wrapper:
```tsx
      <div className="relative z-10 flex flex-col min-h-screen">
```
This should stay. No change needed to the playing screen layout.

Find the home screen outer div:
```tsx
    <div className="px-4 py-6 pb-28 space-y-5">
```
Keep `pb-28` here — it's correct for the home screen to leave room for the tab bar.

Find the launch button section and ADD a GET TRIALS button below it.

Find this block (the trial bar section after the launch button):
```tsx
      {/* Trial bar */}
      <div className="flex items-center justify-center gap-2">
```

Add this button BEFORE the trial bar div:
```tsx
      {/* Get Trials shortcut */}
      <a
        href="/store"
        className="w-full hud-card py-3 flex items-center justify-center gap-2 hover:border-[var(--alien-border-glow)] hover:bg-[#00f0ff06] transition-all duration-200 active:scale-[0.99]"
        style={{ textDecoration: "none" }}
      >
        <span style={{ color: "var(--alien-energy)", fontSize: "14px" }}>⚡</span>
        <span style={{ fontFamily: "var(--font-display)", fontSize: "11px", letterSpacing: "0.2em" }}
          className="text-[var(--alien-energy)] uppercase glow-energy">
          GET TRIALS
        </span>
      </a>
```

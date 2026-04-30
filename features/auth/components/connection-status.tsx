"use client";

import { useAlien } from "@alien_org/react";

export function ConnectionStatus() {
  const { authToken, isBridgeAvailable } = useAlien();

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200/60 bg-white dark:border-zinc-800/60 dark:bg-zinc-900">
      <div className="p-5">
        <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          Connection
        </h2>
        <div className="space-y-3">
          <Row
            label="Bridge"
            value={isBridgeAvailable ? "Connected" : "Not available"}
            ok={isBridgeAvailable}
          />
          <Row
            label="Auth Token"
            value={authToken ? "Present" : "Missing"}
            ok={!!authToken}
          />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-medium text-zinc-900 dark:text-zinc-100">
          {value}
        </span>
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-amber-400"}`}
        />
      </div>
    </div>
  );
}

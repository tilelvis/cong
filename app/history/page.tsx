"use client";

export default function HistoryPage() {
  return (
    <div className="px-4 py-8 space-y-6">
      <div className="text-center">
        <div style={{ fontFamily: "var(--font-display)" }} className="text-[var(--alien-plasma)] text-xl font-black uppercase tracking-[0.2em] glow-plasma">
          ◌ MISSION INTEL
        </div>
        <div style={{ fontFamily: "var(--font-mono)" }} className="text-[var(--alien-text-muted)] text-[10px] tracking-[0.25em] mt-1 uppercase">
          PROTOCOL LOGS
        </div>
      </div>
      <div className="hud-card p-8 text-center">
        <div style={{ fontFamily: "var(--font-mono)" }} className="text-[var(--alien-text-dim)] text-sm uppercase tracking-widest">
          ACCESSING ENCRYPTED ARCHIVES...
        </div>
      </div>
    </div>
  );
}

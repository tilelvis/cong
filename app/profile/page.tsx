"use client";

import { useAlien } from "@alien_org/react";
import { sanitize } from "@/lib/sanitize";

export default function ProfilePage() {
  const { authToken } = useAlien();
  // Simplified profile for now as instructions didn't provide a full profile UI
  return (
    <div className="px-4 py-8 space-y-6">
      <div className="text-center">
        <div style={{ fontFamily: "var(--font-display)" }} className="text-[var(--alien-plasma)] text-xl font-black uppercase tracking-[0.2em] glow-plasma">
          ◉ USER PROFILE
        </div>
      </div>
      <div className="hud-card p-6 space-y-4">
        <div className="space-y-1">
          <div style={{ fontFamily: "var(--font-mono)" }} className="text-[var(--alien-text-muted)] text-[9px] tracking-[0.3em] uppercase">NEURAL IDENTITY</div>
          <div style={{ fontFamily: "var(--font-display)" }} className="text-[var(--alien-text)] text-lg">
            {authToken ? "AUTHENTICATED" : "GUEST_UNIT_01"}
          </div>
        </div>
      </div>
    </div>
  );
}

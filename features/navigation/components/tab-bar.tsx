"use client";

import { usePathname, useRouter } from "next/navigation";

const tabs = [
  { href: "/",        emoji: "🎮", label: "PLAY"    },
  { href: "/store",   emoji: "⚡", label: "TRIALS"  },
  { href: "/history", emoji: "📋", label: "HISTORY" },
  { href: "/profile", emoji: "👾", label: "PROFILE" },
];

export function TabBar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-[390px] mx-auto">
        <div
          className="flex items-center justify-around px-2 py-2"
          style={{
            background: "rgba(2, 4, 9, 0.97)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: "1px solid var(--alien-border)",
            boxShadow: "0 -1px 0 var(--alien-border-glow), 0 -8px 30px #00f0ff08",
            paddingBottom: "max(8px, env(safe-area-inset-bottom))",
          }}
        >
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <button
                key={tab.href}
                onClick={() => router.push(tab.href)}
                className="flex flex-col items-center gap-0.5 px-4 py-1 transition-all duration-200 relative"
                style={{ minWidth: 60 }}
              >
                <span style={{ fontSize: "22px", lineHeight: 1 }}>{tab.emoji}</span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.1em",
                    fontSize: "9px",
                    color: isActive ? "var(--alien-plasma)" : "var(--alien-text-muted)",
                    textShadow: isActive ? "0 0 8px var(--alien-plasma)" : "none",
                  }}
                  className="uppercase transition-all duration-200"
                >
                  {tab.label}
                </span>
                {isActive && (
                  <div
                    className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full"
                    style={{
                      background: "var(--alien-plasma)",
                      boxShadow: "0 0 8px var(--alien-plasma)",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

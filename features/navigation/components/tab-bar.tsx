"use client";

import { usePathname, useRouter } from "next/navigation";

const tabs = [
  { href: "/", icon: "⬡", label: "BASE" },
  { href: "/store", icon: "◈", label: "DEPOT" },
  { href: "/profile", icon: "◉", label: "PROFILE" },
  { href: "/history", icon: "◌", label: "INTEL" },
];

export function TabBar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-[390px] mx-auto">
        <div
          className="flex items-center justify-around px-2 py-2 pb-safe-bottom"
          style={{
            background: "rgba(2, 4, 9, 0.95)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: "1px solid var(--alien-border)",
            boxShadow: "0 -1px 0 var(--alien-border-glow), 0 -8px 30px #00f0ff08",
          }}
        >
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <button
                key={tab.href}
                onClick={() => router.push(tab.href)}
                className="flex flex-col items-center gap-1 px-5 py-1.5 group transition-all duration-200 relative"
              >
                <span
                  className="text-xl transition-all duration-200"
                  style={{
                    color: isActive ? "var(--alien-plasma)" : "var(--alien-text-muted)",
                    filter: isActive ? "drop-shadow(0 0 8px var(--alien-plasma))" : "none",
                    fontSize: "18px",
                  }}
                >
                  {tab.icon}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.12em",
                    fontSize: "8px",
                    color: isActive ? "var(--alien-plasma)" : "var(--alien-text-muted)",
                    textShadow: isActive ? "0 0 8px var(--alien-plasma)" : "none",
                  }}
                  className="uppercase transition-all duration-200"
                >
                  {tab.label}
                </span>
                {isActive && (
                  <div
                    className="w-1 h-1 rounded-full alien-pulse absolute -bottom-0.5"
                    style={{
                      background: "var(--alien-plasma)",
                      boxShadow: "0 0 6px var(--alien-plasma)",
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

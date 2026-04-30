"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Compass, User, Gem, type LucideIcon } from "lucide-react";

export interface TabItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const DEFAULT_TABS: TabItem[] = [
  { label: "Home", href: "/", icon: House },
  { label: "Store", href: "/store", icon: Gem },
  { label: "Explore", href: "/explore", icon: Compass },
  { label: "Profile", href: "/profile", icon: User },
];

function isActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function TabBar({ tabs = DEFAULT_TABS }: { tabs?: TabItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-50">
      <div className="border-t border-zinc-200/80 bg-white/80 pb-safe-bottom pl-safe-left pr-safe-right backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-md">
          {tabs.map((tab) => {
            const active = isActive(tab.href, pathname);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-1 flex-col items-center gap-0.5 pb-2 pt-2.5 transition-colors duration-150 ${
                  active
                    ? "text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-400 active:text-zinc-600 dark:text-zinc-500 dark:active:text-zinc-300"
                }`}
              >
                <span
                  className={`absolute top-0 h-[2px] w-6 rounded-full transition-all duration-200 ${
                    active
                      ? "scale-x-100 bg-zinc-900 dark:bg-zinc-100"
                      : "scale-x-0 bg-transparent"
                  }`}
                />
                <Icon size={22} strokeWidth={active ? 2 : 1.5} />
                <span
                  className={`text-[10px] leading-tight tracking-wide ${
                    active ? "font-semibold" : "font-medium"
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

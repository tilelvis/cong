import { ConnectionStatus } from "@/features/auth/components/connection-status";
import { UserInfo } from "@/features/user/components/user-info";

export default function Home() {
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Alien Miniapp
        </h1>
        <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
          Your miniapp is running.
        </p>
      </div>

      <ConnectionStatus />
      <UserInfo />

      <div className="overflow-hidden rounded-xl border border-zinc-200/60 bg-white dark:border-zinc-800/60 dark:bg-zinc-900">
        <div className="p-5">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Stack
          </h2>
          <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <li>Next.js 16 &middot; App Router</li>
            <li>TypeScript &middot; Strict mode</li>
            <li>Tailwind CSS 4 &middot; Geist fonts</li>
            <li>PostgreSQL &middot; Drizzle ORM</li>
            <li>React Query &middot; Zod validation</li>
          </ul>
        </div>
      </div>
    </>
  );
}

import { ConnectionStatus } from "@/features/auth/components/connection-status";
import { UserInfo } from "@/features/user/components/user-info";

export default function ProfilePage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        Profile
      </h1>

      <UserInfo />
      <ConnectionStatus />

      <div className="overflow-hidden rounded-xl border border-zinc-200/60 bg-white dark:border-zinc-800/60 dark:bg-zinc-900">
        <div className="p-5">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            About
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">App</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-100">Alien Miniapp</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">Version</dt>
              <dd className="font-mono text-xs text-zinc-900 dark:text-zinc-100">0.1.0</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">Runtime</dt>
              <dd className="font-mono text-xs text-zinc-900 dark:text-zinc-100">Next.js 16</dd>
            </div>
          </dl>
        </div>
      </div>
    </>
  );
}

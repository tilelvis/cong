"use client";

import { useCurrentUser } from "../hooks/use-current-user";

function truncate(value: string, max = 16) {
  return value.length > max ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString();
}

function Skeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200/60 bg-white dark:border-zinc-800/60 dark:bg-zinc-900">
      <div className="p-5">
        <div className="mb-4 h-3 w-14 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-3.5 w-14 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
              <div className="h-3.5 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function UserInfo() {
  const { user, loading, error, isAuthenticated } = useCurrentUser();

  if (loading) return <Skeleton />;

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200/60 bg-white dark:border-zinc-800/60 dark:bg-zinc-900">
      <div className="p-5">
        <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          User
        </h2>
        {error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : !isAuthenticated ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Open this app in Alien to authenticate.
          </p>
        ) : user ? (
          <dl className="space-y-3">
            <Field label="User ID" value={truncate(user.id)} />
            <Field label="Alien ID" value={truncate(user.alienId)} />
            <Field label="Created" value={formatDate(user.createdAt)} />
          </dl>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-sm text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="font-mono text-xs font-medium text-zinc-900 dark:text-zinc-100">
        {value}
      </dd>
    </div>
  );
}

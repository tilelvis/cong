export default function ExplorePage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        Explore
      </h1>

      <div className="overflow-hidden rounded-xl border border-zinc-200/60 bg-white dark:border-zinc-800/60 dark:bg-zinc-900">
        <div className="p-5">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            About this page
          </h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            This is a placeholder page included in the boilerplate to demonstrate
            multi-page routing with the bottom tab navigation. Replace this
            content with your own.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {(["Auth flow", "API route", "DB queries", "Zod DTOs"] as const).map(
          (label) => (
            <div
              key={label}
              className="rounded-xl border border-zinc-200/60 bg-white p-4 dark:border-zinc-800/60 dark:bg-zinc-900"
            >
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {label}
              </p>
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                Included
              </p>
            </div>
          ),
        )}
      </div>
    </>
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading dashboard">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-7 w-36 rounded-md skeleton" />
          <div className="h-4 w-24 rounded-md skeleton" />
        </div>
        <div className="h-8 w-28 rounded-md skeleton" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg bg-bg-surface border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 rounded skeleton" />
              <div className="h-3.5 w-3.5 rounded skeleton" />
            </div>
            <div className="h-8 w-12 rounded skeleton" />
          </div>
        ))}
      </div>

      {/* Active jobs skeleton */}
      <div className="rounded-lg bg-bg-surface border border-border p-4">
        <div className="h-4 w-28 rounded skeleton mb-3" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 w-full rounded-md skeleton" />
          ))}
        </div>
      </div>
    </div>
  );
}

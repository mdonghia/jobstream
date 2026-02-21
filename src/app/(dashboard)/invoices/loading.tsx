export default function InvoicesLoading() {
  return (
    <div>
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-7 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mt-1.5" />
        </div>
        <div className="h-9 w-36 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-lg border border-[#E3E8EE] p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-6 w-28 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mt-1.5" />
          </div>
        ))}
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-1 mb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-9 bg-gray-200 rounded animate-pulse"
            style={{ width: 60 + i * 8 }}
          />
        ))}
      </div>

      {/* Search skeleton */}
      <div className="h-10 bg-gray-200 rounded animate-pulse mb-4" />

      {/* Table skeleton */}
      <div className="bg-white rounded-lg border border-[#E3E8EE] overflow-hidden">
        {/* Header row */}
        <div className="bg-[#F6F8FA] border-b border-[#E3E8EE] px-4 py-3 flex gap-6">
          {[80, 120, 80, 60, 80, 80, 80, 32].map((w, i) => (
            <div
              key={i}
              className="h-4 bg-gray-200 rounded animate-pulse"
              style={{ width: w }}
            />
          ))}
        </div>

        {/* Data rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="px-4 py-3 border-b border-[#E3E8EE] flex gap-6 items-center"
          >
            {[80, 120, 80, 60, 80, 80, 80, 32].map((w, j) => (
              <div
                key={j}
                className="h-4 bg-gray-200 rounded animate-pulse"
                style={{ width: w, opacity: 1 - i * 0.08 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

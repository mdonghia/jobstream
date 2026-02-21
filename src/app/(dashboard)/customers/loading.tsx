export default function CustomersLoading() {
  return (
    <div>
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-7 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mt-1.5" />
        </div>
        <div className="h-9 w-32 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Search skeleton */}
      <div className="h-10 bg-gray-200 rounded animate-pulse mb-4" />

      {/* Filters skeleton */}
      <div className="flex gap-3 mb-6">
        <div className="h-9 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-9 w-32 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-lg border border-[#E3E8EE] overflow-hidden">
        {/* Header */}
        <div className="bg-[#F6F8FA] border-b border-[#E3E8EE] px-4 py-3 flex gap-4">
          {[120, 150, 100, 80, 80, 80, 60].map((w, i) => (
            <div
              key={i}
              className="h-4 bg-gray-200 rounded animate-pulse"
              style={{ width: w }}
            />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="px-4 py-3 border-b border-[#E3E8EE] flex gap-4 items-center"
          >
            {[120, 150, 100, 80, 80, 80, 60].map((w, j) => (
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

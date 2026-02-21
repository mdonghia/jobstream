export default function JobsLoading() {
  return (
    <div>
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-7 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mt-1.5" />
        </div>
        <div className="h-9 w-28 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Status tabs skeleton */}
      <div className="flex gap-4 mb-4 border-b border-[#E3E8EE] pb-2">
        {[60, 80, 90, 80, 70].map((w, i) => (
          <div
            key={i}
            className="h-5 bg-gray-200 rounded animate-pulse"
            style={{ width: w }}
          />
        ))}
      </div>

      {/* Search skeleton */}
      <div className="h-10 bg-gray-200 rounded animate-pulse mb-4" />

      {/* Filters skeleton */}
      <div className="flex gap-3 mb-6">
        <div className="h-9 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="h-9 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-9 w-36 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-lg border border-[#E3E8EE] overflow-hidden">
        {/* Table header */}
        <div className="bg-[#F6F8FA] border-b border-[#E3E8EE] px-4 py-3 flex gap-6">
          {[60, 100, 120, 80, 100, 60, 70, 30].map((w, i) => (
            <div
              key={i}
              className="h-4 bg-gray-200 rounded animate-pulse"
              style={{ width: w }}
            />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="px-4 py-3 border-b border-[#E3E8EE] flex gap-6 items-center"
          >
            {[60, 100, 120, 80, 100, 60, 70, 30].map((w, j) => (
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

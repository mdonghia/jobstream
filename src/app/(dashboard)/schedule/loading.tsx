export default function ScheduleLoading() {
  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Main calendar area */}
      <div className="flex-1 min-w-0 p-6">
        {/* Header skeleton */}
        <div className="mb-4">
          <div className="h-7 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mt-1.5" />
        </div>

        {/* Toolbar skeleton */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
            <div className="h-6 w-6 bg-gray-200 rounded animate-pulse" />
            <div className="h-6 w-6 bg-gray-200 rounded animate-pulse" />
            <div className="h-5 w-40 bg-gray-200 rounded animate-pulse ml-1" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-8 w-64 bg-gray-200 rounded-md animate-pulse" />
          </div>
        </div>

        {/* Calendar grid skeleton */}
        <div className="border border-[#E3E8EE] rounded-lg overflow-hidden bg-white">
          {/* Day headers */}
          <div className="grid grid-cols-8 border-b border-[#E3E8EE] bg-[#F6F8FA]">
            <div className="w-16 border-r border-[#E3E8EE] py-3" />
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="py-3 px-2 border-r border-[#E3E8EE] last:border-r-0">
                <div className="h-3 w-8 bg-gray-200 rounded animate-pulse mx-auto" />
                <div
                  className="h-5 w-6 bg-gray-200 rounded animate-pulse mx-auto mt-1"
                  style={{ opacity: 1 - i * 0.08 }}
                />
              </div>
            ))}
          </div>

          {/* Time grid rows */}
          <div className="grid grid-cols-8" style={{ height: 480 }}>
            <div className="border-r border-[#E3E8EE]">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="border-b border-[#E3E8EE] px-2 pt-1"
                  style={{ height: 60 }}
                >
                  <div
                    className="h-3 w-10 bg-gray-200 rounded animate-pulse ml-auto"
                    style={{ opacity: 1 - i * 0.06 }}
                  />
                </div>
              ))}
            </div>
            {Array.from({ length: 7 }).map((_, col) => (
              <div key={col} className="border-r border-[#E3E8EE] last:border-r-0 relative">
                {Array.from({ length: 8 }).map((_, row) => (
                  <div
                    key={row}
                    className="border-b border-[#E3E8EE]"
                    style={{ height: 60 }}
                  />
                ))}
                {/* Fake job blocks */}
                {col % 3 === 0 && (
                  <div
                    className="absolute left-0.5 right-0.5 bg-gray-100 rounded-md animate-pulse"
                    style={{
                      top: 60 + col * 15,
                      height: 50,
                      opacity: 0.7,
                    }}
                  />
                )}
                {col % 2 === 1 && (
                  <div
                    className="absolute left-0.5 right-0.5 bg-gray-100 rounded-md animate-pulse"
                    style={{
                      top: 180 + col * 10,
                      height: 70,
                      opacity: 0.6,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar skeleton */}
      <div className="w-[280px] shrink-0 border-l border-[#E3E8EE] bg-white">
        <div className="px-3 py-3 border-b border-[#E3E8EE] bg-[#F6F8FA]">
          <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="p-2 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-[#E3E8EE] p-3"
              style={{ opacity: 1 - i * 0.15 }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-12 bg-gray-200 rounded-full animate-pulse" />
              </div>
              <div className="h-3 w-20 bg-gray-200 rounded animate-pulse mt-2" />
              <div className="h-2.5 w-16 bg-gray-200 rounded animate-pulse mt-1.5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

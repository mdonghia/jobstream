import { cn } from "@/lib/utils"

interface SkeletonCardProps {
  lines?: number
}

const lineWidths = ["w-3/4", "w-full", "w-2/3", "w-5/6", "w-1/2"]

export function SkeletonCard({ lines = 3 }: SkeletonCardProps) {
  return (
    <div className="rounded-lg border border-[#E3E8EE] bg-white p-6">
      <div className="mb-4 h-5 w-1/3 animate-pulse rounded bg-gray-200" />
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "h-4 animate-pulse rounded bg-gray-200",
              lineWidths[index % lineWidths.length]
            )}
          />
        ))}
      </div>
    </div>
  )
}

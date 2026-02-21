import { cn } from "@/lib/utils"

interface SkeletonTableProps {
  rows?: number
  columns?: number
}

const columnWidths = ["w-1/4", "w-1/3", "w-1/5", "w-2/5", "w-1/6", "w-1/4", "w-1/3"]

export function SkeletonTable({ rows = 5, columns = 5 }: SkeletonTableProps) {
  return (
    <div className="w-full">
      <div className="relative w-full overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F6F8FA]">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <th key={colIndex} className="px-4 py-3 text-left">
                  <div
                    className={cn(
                      "h-3 animate-pulse rounded bg-gray-200",
                      columnWidths[colIndex % columnWidths.length]
                    )}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-b border-[#E3E8EE]">
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="px-4 py-3">
                    <div
                      className={cn(
                        "h-4 animate-pulse rounded bg-gray-200",
                        columnWidths[(colIndex + rowIndex) % columnWidths.length]
                      )}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

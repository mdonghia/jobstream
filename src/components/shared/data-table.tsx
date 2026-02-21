"use client"

import { type ReactNode } from "react"
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (row: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  total: number
  page: number
  perPage: number
  onPageChange: (page: number) => void
  onSort?: (key: string, order: "asc" | "desc") => void
  sortBy?: string
  sortOrder?: "asc" | "desc"
  onRowClick?: (row: T) => void
  rowActions?: (row: T) => ReactNode
  loading?: boolean
  emptyState?: ReactNode
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  total,
  page,
  perPage,
  onPageChange,
  onSort,
  sortBy,
  sortOrder,
  onRowClick,
  rowActions,
  loading = false,
  emptyState,
}: DataTableProps<T>) {
  const totalPages = Math.ceil(total / perPage)
  const startItem = (page - 1) * perPage + 1
  const endItem = Math.min(page * perPage, total)

  function handleSort(key: string) {
    if (!onSort) return
    const newOrder = sortBy === key && sortOrder === "asc" ? "desc" : "asc"
    onSort(key, newOrder)
  }

  function renderSortIcon(key: string) {
    if (sortBy !== key) {
      return <ArrowUpDown className="ml-1 inline-block size-3.5 text-[#8898AA]" />
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="ml-1 inline-block size-3.5 text-[#0A2540]" />
    ) : (
      <ArrowDown className="ml-1 inline-block size-3.5 text-[#0A2540]" />
    )
  }

  if (!loading && data.length === 0 && emptyState) {
    return <>{emptyState}</>
  }

  return (
    <div className="w-full">
      <div className="relative w-full overflow-x-auto">
        <table className="w-full caption-bottom text-sm">
          <thead>
            <tr className="bg-[#F6F8FA]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]",
                    col.sortable && "cursor-pointer select-none",
                    col.className
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center">
                    {col.label}
                    {col.sortable && renderSortIcon(col.key)}
                  </span>
                </th>
              ))}
              {rowActions && (
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-[#8898AA]">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className={cn(loading && "pointer-events-none opacity-50")}>
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={cn(
                  "border-b border-[#E3E8EE] transition-colors hover:bg-[#F6F8FA]/50",
                  onRowClick && "cursor-pointer"
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn("px-4 py-3 text-sm text-[#425466]", col.className)}
                  >
                    {col.render
                      ? col.render(row)
                      : (row[col.key] as ReactNode) ?? "—"}
                  </td>
                ))}
                {rowActions && (
                  <td className="px-4 py-3 text-right text-sm">
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center"
                    >
                      {rowActions(row)}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between border-t border-[#E3E8EE] px-4 py-3">
          <p className="text-sm text-[#8898AA]">
            Showing {startItem} to {endItem} of {total} results
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="border-[#E3E8EE]"
            >
              <ChevronLeft className="size-4" />
            </Button>
            {generatePageNumbers(page, totalPages).map((pageNum, i) =>
              pageNum === "..." ? (
                <span key={`ellipsis-${i}`} className="px-2 text-sm text-[#8898AA]">
                  ...
                </span>
              ) : (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? "default" : "outline"}
                  size="icon-sm"
                  onClick={() => onPageChange(pageNum as number)}
                  className={cn(
                    "min-w-8",
                    pageNum === page
                      ? "bg-[#635BFF] text-white hover:bg-[#635BFF]/90"
                      : "border-[#E3E8EE]"
                  )}
                >
                  {pageNum}
                </Button>
              )
            )}
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="border-[#E3E8EE]"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function generatePageNumbers(
  current: number,
  total: number
): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages: (number | "...")[] = [1]

  if (current > 3) {
    pages.push("...")
  }

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  if (current < total - 2) {
    pages.push("...")
  }

  pages.push(total)

  return pages
}

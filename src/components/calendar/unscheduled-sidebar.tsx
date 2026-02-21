"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, ChevronLeft, AlertCircle, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DraggableJob } from "./dnd-wrappers"
import type { DragData } from "./dnd-wrappers"

// ── Types ──────────────────────────────────────────────────────────────────────

export interface UnscheduledJob {
  id: string
  title: string
  jobNumber: string
  priority: string
  status: string
  customer: { firstName: string; lastName: string }
}

interface UnscheduledSidebarProps {
  jobs: UnscheduledJob[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getPriorityConfig(priority: string) {
  const config: Record<string, { label: string; className: string }> = {
    LOW: { label: "Low", className: "bg-gray-50 text-gray-600 border-gray-200" },
    MEDIUM: { label: "Medium", className: "bg-blue-50 text-blue-600 border-blue-200" },
    HIGH: { label: "High", className: "bg-orange-50 text-orange-600 border-orange-200" },
    URGENT: { label: "Urgent", className: "bg-red-50 text-red-600 border-red-200" },
  }
  return config[priority] || config.MEDIUM
}

// ── Component ──────────────────────────────────────────────────────────────────

export function UnscheduledSidebar({ jobs }: UnscheduledSidebarProps) {
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div
      className={cn(
        "shrink-0 border-l border-[#E3E8EE] bg-white transition-all duration-200 flex flex-col",
        collapsed ? "w-10" : "w-[280px]"
      )}
    >
      {/* Toggle bar */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-[#E3E8EE] bg-[#F6F8FA]">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[#0A2540]">Unscheduled</h3>
            {jobs.length > 0 && (
              <span className="text-[10px] font-medium text-white bg-[#635BFF] rounded-full w-5 h-5 flex items-center justify-center">
                {jobs.length}
              </span>
            )}
          </div>
        )}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setCollapsed(!collapsed)}
          className="text-[#8898AA] hover:text-[#0A2540]"
        >
          {collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </Button>
      </div>

      {/* Content */}
      {!collapsed && (
        <ScrollArea className="flex-1 overflow-hidden">
          <div className="p-2 space-y-2">
            {jobs.length === 0 ? (
              <div className="py-8 text-center">
                <AlertCircle className="w-8 h-8 text-[#E3E8EE] mx-auto mb-2" />
                <p className="text-xs text-[#8898AA]">No unscheduled jobs</p>
                <p className="text-[10px] text-[#8898AA] mt-1">Drag jobs here to unschedule them</p>
              </div>
            ) : (
              jobs.map((job) => {
                const priority = getPriorityConfig(job.priority)

                const dragData: DragData = {
                  type: "unscheduled",
                  job: {
                    id: job.id,
                    title: job.title,
                    jobNumber: job.jobNumber,
                    priority: job.priority,
                    status: job.status,
                    customer: job.customer,
                  },
                }

                return (
                  <DraggableJob
                    key={job.id}
                    id={`unscheduled-${job.id}`}
                    data={dragData}
                  >
                    <div
                      onClick={() => router.push(`/jobs/${job.id}`)}
                      className="w-full text-left rounded-lg border border-[#E3E8EE] p-3 hover:border-[#635BFF]/40 hover:shadow-sm transition-all group cursor-grab active:cursor-grabbing"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-1.5 min-w-0">
                          <GripVertical className="w-3.5 h-3.5 text-[#8898AA] mt-0.5 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
                          <p className="text-sm font-medium text-[#0A2540] group-hover:text-[#635BFF] truncate leading-tight">
                            {job.title}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] px-1.5 py-0 shrink-0", priority.className)}
                        >
                          {priority.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-[#425466] mt-1 truncate pl-5">
                        {job.customer.firstName} {job.customer.lastName}
                      </p>
                      <p className="text-[10px] text-[#8898AA] mt-0.5 pl-5">{job.jobNumber}</p>
                    </div>
                  </DraggableJob>
                )
              })
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

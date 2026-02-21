"use client"

import React, { useCallback, useRef, useState } from "react"
import { useDraggable, useDroppable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"
import { GripHorizontal } from "lucide-react"
import type { CalendarJob } from "./month-view"

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DragData {
  type: "job" | "unscheduled"
  job: CalendarJob | { id: string; title: string; jobNumber: string; priority: string; status: string; customer: { firstName: string; lastName: string } }
  sourceDate?: string
  sourceMemberId?: string
}

export interface DropData {
  type: "time-slot" | "day-slot"
  date: string // ISO date string (yyyy-MM-dd)
  time?: string // HH:mm
  hour?: number
  memberId?: string
}

// ── DraggableJob ───────────────────────────────────────────────────────────────

interface DraggableJobProps {
  id: string
  data: DragData
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  disabled?: boolean
}

export function DraggableJob({ id, data, children, className, style, disabled }: DraggableJobProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `job-${id}`,
    data,
    disabled,
  })

  const dragStyle: React.CSSProperties = {
    ...style,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? "grabbing" : "grab",
    zIndex: isDragging ? 50 : style?.zIndex,
    position: style?.position || "relative",
    touchAction: "none",
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={className}
      style={dragStyle}
    >
      {children}
    </div>
  )
}

// ── DroppableSlot ──────────────────────────────────────────────────────────────

interface DroppableSlotProps {
  id: string
  data: DropData
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  isConflict?: boolean
  conflictInfo?: string
  disabled?: boolean
}

export function DroppableSlot({
  id,
  data,
  children,
  className,
  style,
  isConflict,
  conflictInfo,
  disabled,
}: DroppableSlotProps) {
  const { isOver, setNodeRef, active } = useDroppable({
    id: `slot-${id}`,
    data,
    disabled,
  })

  const isActive = isOver && active

  return (
    <div
      ref={setNodeRef}
      className={cn(
        className,
        isActive && !isConflict && "bg-[#635BFF]/10 transition-colors",
        isActive && isConflict && "bg-red-50 transition-colors"
      )}
      style={style}
    >
      {children}
      {isActive && isConflict && conflictInfo && (
        <div className="absolute inset-x-0 bottom-0 px-1 py-0.5 text-[9px] text-red-600 font-medium bg-red-50/90 truncate z-30 pointer-events-none">
          Conflicts: {conflictInfo}
        </div>
      )}
    </div>
  )
}

// ── ResizeHandle ───────────────────────────────────────────────────────────────

interface ResizeHandleProps {
  jobId: string
  initialHeight: number
  hourHeight: number
  minDuration: number // in minutes
  snapIncrement: number // in minutes
  onResizeEnd: (jobId: string, newDurationMinutes: number) => void
}

export function ResizeHandle({
  jobId,
  initialHeight,
  hourHeight,
  minDuration,
  snapIncrement,
  onResizeEnd,
}: ResizeHandleProps) {
  const [isResizing, setIsResizing] = useState(false)
  const startYRef = useRef(0)
  const startHeightRef = useRef(0)
  const currentDeltaRef = useRef(0)
  const parentRef = useRef<HTMLElement | null>(null)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      e.preventDefault()

      const target = e.currentTarget as HTMLElement
      parentRef.current = target.parentElement
      startYRef.current = e.clientY
      startHeightRef.current = initialHeight
      currentDeltaRef.current = 0
      setIsResizing(true)

      target.setPointerCapture(e.pointerId)

      const handlePointerMove = (moveEvent: PointerEvent) => {
        moveEvent.preventDefault()
        const delta = moveEvent.clientY - startYRef.current
        currentDeltaRef.current = delta

        // Apply visual feedback via parent height
        if (parentRef.current) {
          const minutesPerPixel = 60 / hourHeight
          const newDuration = ((startHeightRef.current + delta) / hourHeight) * 60
          const snappedDuration = Math.max(
            minDuration,
            Math.round(newDuration / snapIncrement) * snapIncrement
          )
          const snappedHeight = (snappedDuration / 60) * hourHeight
          parentRef.current.style.height = `${Math.max(snappedHeight, (minDuration / 60) * hourHeight)}px`
        }
      }

      const handlePointerUp = (upEvent: PointerEvent) => {
        setIsResizing(false)
        const delta = upEvent.clientY - startYRef.current
        const newDuration = ((startHeightRef.current + delta) / hourHeight) * 60
        const snappedDuration = Math.max(
          minDuration,
          Math.round(newDuration / snapIncrement) * snapIncrement
        )

        // Reset inline styles
        if (parentRef.current) {
          parentRef.current.style.height = ""
        }

        onResizeEnd(jobId, snappedDuration)

        target.removeEventListener("pointermove", handlePointerMove)
        target.removeEventListener("pointerup", handlePointerUp)
      }

      target.addEventListener("pointermove", handlePointerMove)
      target.addEventListener("pointerup", handlePointerUp)
    },
    [jobId, initialHeight, hourHeight, minDuration, snapIncrement, onResizeEnd]
  )

  return (
    <div
      onPointerDown={handlePointerDown}
      className={cn(
        "absolute bottom-0 left-0 right-0 h-2 cursor-s-resize flex items-center justify-center z-20 group/resize",
        "hover:bg-[#635BFF]/10 transition-colors rounded-b-md",
        isResizing && "bg-[#635BFF]/20"
      )}
      style={{ touchAction: "none" }}
    >
      <GripHorizontal className="w-3 h-3 text-[#8898AA] opacity-0 group-hover/resize:opacity-100 transition-opacity" />
    </div>
  )
}

// ── DragOverlayContent ─────────────────────────────────────────────────────────

interface DragOverlayJobProps {
  job: DragData["job"]
}

export function DragOverlayJob({ job }: DragOverlayJobProps) {
  const color = "assignments" in job && job.assignments.length > 0 && job.assignments[0].user.color
    ? job.assignments[0].user.color
    : "#635BFF"

  return (
    <div
      className="rounded-md px-2 py-1.5 text-left shadow-lg border border-[#E3E8EE] max-w-[200px] pointer-events-none"
      style={{
        backgroundColor: `${color}18`,
        borderLeft: `3px solid ${color}`,
        opacity: 0.85,
      }}
    >
      <p className="text-xs font-semibold text-[#0A2540] truncate leading-tight">
        {job.customer.firstName} {job.customer.lastName}
      </p>
      <p className="text-[10px] text-[#425466] truncate leading-tight mt-0.5">
        {job.title}
      </p>
      <p className="text-[10px] text-[#8898AA] truncate leading-tight mt-0.5">
        {"jobNumber" in job ? job.jobNumber : ""}
      </p>
    </div>
  )
}

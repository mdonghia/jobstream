import { cn } from "@/lib/utils"

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info"

interface StatusBadgeProps {
  status: string
  variant?: BadgeVariant
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-700",
  success: "bg-green-50 text-green-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  info: "bg-blue-50 text-blue-700",
}

const statusVariantMap: Record<string, BadgeVariant> = {
  ACTIVE: "success",
  PAID: "success",
  COMPLETED: "success",
  APPROVED: "success",
  CONFIRMED: "success",
  DELIVERED: "success",
  PENDING: "default",
  DRAFT: "default",
  SCHEDULED: "info",
  UNSCHEDULED: "warning",
  ANYTIME: "default",
  EN_ROUTE: "info",
  OVERDUE: "danger",
  URGENT: "danger",
  DECLINED: "danger",
  SENT: "info",
  IN_PROGRESS: "info",
  VIEWED: "info",
  PARTIALLY_PAID: "info",
  EXPIRED: "warning",
  CANCELLED: "warning",
  VOID: "warning",
}

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function detectVariant(status: string): BadgeVariant {
  const normalized = status.toUpperCase().replace(/\s+/g, "_")
  return statusVariantMap[normalized] ?? "default"
}

export function StatusBadge({ status, variant }: StatusBadgeProps) {
  const resolvedVariant = variant ?? detectVariant(status)

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variantStyles[resolvedVariant]
      )}
    >
      {toTitleCase(status)}
    </span>
  )
}

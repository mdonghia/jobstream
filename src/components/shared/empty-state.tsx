import Link from "next/link"
import { type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateAction {
  label: string
  href?: string
  onClick?: () => void
}

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: EmptyStateAction
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Icon className="mb-4 text-[#8898AA]" size={64} strokeWidth={1.5} />
      <h2 className="mb-2 text-lg font-semibold text-[#0A2540]">{title}</h2>
      <p className="max-w-md text-center text-sm text-[#425466]">{description}</p>
      {action && action.href && (
        <Button asChild className="mt-4 bg-[#635BFF] text-white hover:bg-[#635BFF]/90">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
      {action && !action.href && action.onClick && (
        <Button
          onClick={action.onClick}
          className="mt-4 bg-[#635BFF] text-white hover:bg-[#635BFF]/90"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}

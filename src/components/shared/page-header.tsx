import Link from "next/link"

interface Breadcrumb {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: Breadcrumb[]
  actions?: React.ReactNode
}

export function PageHeader({ title, description, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mb-2 flex items-center gap-1 text-xs text-[#8898AA]">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1
              return (
                <span key={index} className="flex items-center gap-1">
                  {index > 0 && <span>/</span>}
                  {crumb.href && !isLast ? (
                    <Link href={crumb.href} className="hover:text-[#425466] transition-colors">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={isLast ? "text-[#425466]" : ""}>{crumb.label}</span>
                  )}
                </span>
              )
            })}
          </nav>
        )}
        <h1 className="text-2xl font-semibold text-[#0A2540]">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-[#425466]">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

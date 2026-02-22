import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { name: true, logo: true, phone: true, email: true },
  })

  if (!org) notFound()

  return (
    <div className="min-h-screen bg-[#F6F8FA]">
      {/* Header */}
      <header className="bg-white border-b border-[#E3E8EE]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          {org.logo ? (
            <img
              src={org.logo}
              alt={org.name}
              className="h-8 w-8 rounded-lg object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-[#635BFF] flex items-center justify-center text-white font-bold text-sm">
              {org.name.charAt(0)}
            </div>
          )}
          <span className="text-lg font-semibold text-[#0A2540]">
            {org.name}
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>

      {/* Footer */}
      <footer className="border-t border-[#E3E8EE] bg-white mt-auto">
        <div className="max-w-3xl mx-auto px-4 py-4 text-center text-xs text-[#8898AA]">
          Powered by JobStream
        </div>
      </footer>
    </div>
  )
}

import { prisma } from "@/lib/db"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { getPortalSession } from "@/actions/portal"
import { PortalNav } from "@/components/portal/portal-nav"

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

  // Check for portal session cookie
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(`portal_session_${slug}`)?.value
  let portalSession: Awaited<ReturnType<typeof getPortalSession>> = null

  if (sessionToken) {
    portalSession = await getPortalSession(slug, sessionToken)
  }

  // If the customer has a valid session, show the portal nav
  if (portalSession) {
    const { customer, organization } = portalSession
    const customerName = `${customer.firstName} ${customer.lastName}`

    return (
      <div className="min-h-screen bg-[#F6F8FA] flex flex-col">
        {/* Authenticated portal nav */}
        <PortalNav
          slug={slug}
          customerName={customerName}
          orgName={organization.name}
          orgLogo={organization.logo}
        />

        {/* Content */}
        <main className="max-w-5xl mx-auto w-full px-4 py-8 flex-1">{children}</main>

        {/* Footer */}
        <footer className="border-t border-[#E3E8EE] bg-white mt-auto">
          <div className="max-w-5xl mx-auto px-4 py-4 text-center text-xs text-[#8898AA]">
            Powered by JobStream
          </div>
        </footer>
      </div>
    )
  }

  // Fallback: minimal layout for token-based access (invoices, quotes) and login page
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

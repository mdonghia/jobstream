import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { PublicBookingForm } from "@/components/portal/public-booking-form"

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      logo: true,
      phone: true,
      email: true,
      bookingEnabled: true,
      bookingServices: true,
      bookingSlotDuration: true,
      businessHours: true,
    },
  })

  if (!org) notFound()

  if (!org.bookingEnabled) {
    return (
      <div className="min-h-screen bg-[#F6F8FA] flex items-center justify-center">
        <div className="bg-white rounded-xl border border-[#E3E8EE] p-8 text-center max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-[#0A2540]">
            Booking Unavailable
          </h2>
          <p className="mt-2 text-sm text-[#425466]">
            Online booking is currently not available for {org.name}. Please
            contact them directly.
          </p>
          {org.phone && (
            <p className="mt-4 text-sm text-[#635BFF] font-medium">
              {org.phone}
            </p>
          )}
          {org.email && (
            <p className="text-sm text-[#635BFF] font-medium">{org.email}</p>
          )}
        </div>
      </div>
    )
  }

  // Fetch bookable services
  const serviceFilter: any = {
    organizationId: org.id,
    isActive: true,
  }
  if (
    org.bookingServices &&
    Array.isArray(org.bookingServices) &&
    (org.bookingServices as string[]).length > 0
  ) {
    serviceFilter.id = { in: org.bookingServices as string[] }
  }

  const services = await prisma.service.findMany({
    where: serviceFilter,
    select: { id: true, name: true, description: true, defaultPrice: true },
    orderBy: { sortOrder: "asc" },
  })

  const serializedServices = services.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    defaultPrice: Number(s.defaultPrice),
  }))

  return (
    <div className="min-h-screen bg-[#F6F8FA]">
      {/* Header */}
      <header className="bg-white border-b border-[#E3E8EE]">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
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
      <main className="max-w-2xl mx-auto px-4 py-8">
        <PublicBookingForm
          slug={slug}
          orgName={org.name}
          services={serializedServices}
          businessHours={org.businessHours as Record<string, { start: string; end: string; open: boolean }> | null}
          slotDuration={org.bookingSlotDuration}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E3E8EE] bg-white mt-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 text-center text-xs text-[#8898AA]">
          Powered by JobStream
        </div>
      </footer>
    </div>
  )
}

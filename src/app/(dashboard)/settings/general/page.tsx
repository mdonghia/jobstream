import { requireAuth } from "@/lib/auth-utils"
import { getOrganizationSettings } from "@/actions/settings"
import { GeneralSettingsForm } from "@/components/settings/general-settings-form"

export default async function SettingsGeneralPage() {
  await requireAuth()
  const result = await getOrganizationSettings()

  if ("error" in result) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-[#0A2540]">
          Business Information
        </h2>
        <p className="mt-2 text-sm text-red-500">{result.error}</p>
      </div>
    )
  }

  // Map and serialize only the fields the form needs (Prisma Decimal -> number)
  const org = result.organization
  // Resolve favicon URL if stored in S3
  let faviconUrl: string | null = null
  if (org.logo) {
    if (org.logo.startsWith("s3://")) {
      const { getFileUrl } = await import("@/lib/s3")
      faviconUrl = await getFileUrl(org.logo)
    } else {
      faviconUrl = org.logo
    }
  }

  const settings = {
    id: org.id,
    name: org.name,
    email: org.email,
    phone: org.phone,
    website: org.website,
    address: org.address,
    city: org.city,
    state: org.state,
    zip: org.zip,
    timezone: org.timezone,
    taxRate: Number(org.taxRate),
    currency: org.currency,
    invoicePrefix: org.invoicePrefix,
    quotePrefix: org.quotePrefix,
    jobPrefix: org.jobPrefix,
    invoiceDueDays: org.invoiceDueDays,
    quoteValidDays: org.quoteValidDays,
    businessHours: org.businessHours as Record<
      string,
      { start: string; end: string; open: boolean }
    > | null,
    favicon: faviconUrl,
  }

  return <GeneralSettingsForm organization={settings} />
}

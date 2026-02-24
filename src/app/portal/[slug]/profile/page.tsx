import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getPortalSession } from "@/actions/portal"
import { PortalProfileForm } from "@/components/portal/portal-profile-form"

export default async function PortalProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // Verify session
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(`portal_session_${slug}`)?.value

  if (!sessionToken) {
    redirect(`/portal/${slug}/login`)
  }

  const session = await getPortalSession(slug, sessionToken)
  if (!session) {
    redirect(`/portal/${slug}/login`)
  }

  const { customer } = session

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0A2540]">Your Profile</h1>
        <p className="text-[#425466] mt-1">
          Update your contact information.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-[#E3E8EE] p-6">
        <PortalProfileForm
          customerId={customer.id}
          initialData={{
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email || "",
            phone: customer.phone || "",
          }}
        />
      </div>
    </div>
  )
}

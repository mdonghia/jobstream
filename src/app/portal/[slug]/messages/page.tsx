import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getPortalSession, getPortalMessages } from "@/actions/portal"
import { formatRelativeTime } from "@/lib/utils"
import { PortalMessageForm } from "@/components/portal/portal-message-form"

export default async function PortalMessagesPage({
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

  const { customer, organization } = session
  const messages = await getPortalMessages(customer.id, organization.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0A2540]">Messages</h1>
        <p className="text-[#425466] mt-1">
          Send and view messages with {organization.name}.
        </p>
      </div>

      {/* Send new message */}
      <div className="bg-white rounded-xl border border-[#E3E8EE] p-6">
        <h2 className="text-lg font-semibold text-[#0A2540] mb-3">
          New Message
        </h2>
        <PortalMessageForm customerId={customer.id} orgId={organization.id} />
      </div>

      {/* Message history */}
      <div className="bg-white rounded-xl border border-[#E3E8EE] p-6">
        <h2 className="text-lg font-semibold text-[#0A2540] mb-4">
          Message History
        </h2>
        {messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((message: Record<string, unknown>) => (
              <div
                key={message.id as string}
                className="border-b border-[#E3E8EE] pb-4 last:border-0 last:pb-0"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[#0A2540]">
                    You
                  </span>
                  <span className="text-xs text-[#8898AA]">
                    {formatRelativeTime(message.createdAt as string)}
                  </span>
                </div>
                <p className="text-sm text-[#425466] whitespace-pre-wrap">
                  {message.content as string}
                </p>
                {message.isRead ? (
                  <span className="text-xs text-[#8898AA] mt-1 inline-block">
                    Read
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#8898AA]">No messages yet.</p>
        )}
      </div>
    </div>
  )
}

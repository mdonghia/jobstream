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
          Conversation
        </h2>
        {messages.length > 0 ? (
          <div className="space-y-3">
            {messages.map((message: Record<string, unknown>) => {
              const isOwner = message.isFromOwner as boolean
              return (
                <div
                  key={message.id as string}
                  className={`flex ${isOwner ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2.5 ${
                      isOwner
                        ? "bg-[#F6F8FA] border border-[#E3E8EE] text-[#0A2540]"
                        : "bg-[#635BFF] text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium ${isOwner ? "text-[#8898AA]" : "text-white/80"}`}>
                        {isOwner ? organization.name : "You"}
                      </span>
                      <span className={`text-xs ${isOwner ? "text-[#8898AA]" : "text-white/60"}`}>
                        {formatRelativeTime(message.createdAt as string)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">
                      {message.content as string}
                    </p>
                    {!isOwner && (message.isRead as boolean) ? (
                      <span className="text-xs text-white/60 mt-1 inline-block">
                        Read
                      </span>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-[#8898AA]">No messages yet. Send your first message above.</p>
        )}
      </div>
    </div>
  )
}

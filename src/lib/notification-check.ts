import { prisma } from "@/lib/db"

export async function isNotificationEnabled(
  organizationId: string,
  triggerKey: string,
  channel: "email" | "sms"
): Promise<boolean> {
  // Check per-notification preference
  const pref = await prisma.notificationPreference.findUnique({
    where: { organizationId_triggerKey: { organizationId, triggerKey } },
  })

  // If no preference exists, default: email=true, sms=false
  if (!pref) return channel === "email"

  return channel === "email" ? pref.emailEnabled : pref.smsEnabled
}

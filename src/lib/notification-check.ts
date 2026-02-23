import { prisma } from "@/lib/db"

export async function isNotificationEnabled(
  organizationId: string,
  triggerKey: string,
  channel: "email" | "sms"
): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { commEmailEnabled: true, commSmsEnabled: true },
  })

  if (!org) return false

  // Check global channel toggle first
  if (channel === "email" && !org.commEmailEnabled) return false
  if (channel === "sms" && !org.commSmsEnabled) return false

  // Check per-notification preference
  const pref = await prisma.notificationPreference.findUnique({
    where: { organizationId_triggerKey: { organizationId, triggerKey } },
  })

  // If no preference exists, default: email=true, sms=false
  if (!pref) return channel === "email"

  return channel === "email" ? pref.emailEnabled : pref.smsEnabled
}

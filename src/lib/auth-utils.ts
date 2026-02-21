import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"

export type SessionUser = {
  id: string
  email: string
  name: string
  organizationId: string
  role: "OWNER" | "ADMIN" | "TECHNICIAN"
  firstName: string
  lastName: string
  avatar: string | null
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth()
  if (!session?.user) return null

  return {
    id: session.user.id as string,
    email: session.user.email as string,
    name: session.user.name as string,
    organizationId: (session.user as any).organizationId,
    role: (session.user as any).role,
    firstName: (session.user as any).firstName,
    lastName: (session.user as any).lastName,
    avatar: (session.user as any).avatar,
  }
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }
  return user
}

export async function requireRole(allowedRoles: string[]): Promise<SessionUser> {
  const user = await requireAuth()
  if (!allowedRoles.includes(user.role)) {
    redirect("/")
  }
  return user
}

export async function getOrganization(organizationId: string) {
  return prisma.organization.findUnique({
    where: { id: organizationId },
  })
}

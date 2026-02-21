import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      organizationId: string
      role: "OWNER" | "ADMIN" | "TECHNICIAN"
      firstName: string
      lastName: string
      avatar: string | null
    } & DefaultSession["user"]
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string
    organizationId: string
    role: string
    firstName: string
    lastName: string
    avatar: string | null
  }
}

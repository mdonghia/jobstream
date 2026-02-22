import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"

const { auth } = NextAuth(authConfig)

/**
 * Middleware uses auth.config.ts (no Prisma imports) so it runs on Edge Runtime.
 * The `authorized` callback in authConfig handles all route protection logic.
 */
export default auth

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|placeholder-avatar.png|uploads).*)",
  ],
}

import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"
import type { NextRequest } from "next/server"

const { auth } = NextAuth(authConfig)

/**
 * Proxy uses auth.config.ts (no Prisma imports) for route protection.
 * The `authorized` callback in authConfig handles all route protection logic.
 */
export async function proxy(request: NextRequest) {
  return auth(request as any)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|placeholder-avatar.png|uploads).*)",
  ],
}

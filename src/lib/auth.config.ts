import type { NextAuthConfig } from "next-auth"

/**
 * Auth config that does NOT import Prisma.
 * Used in middleware (Edge Runtime) where Node.js modules are unavailable.
 * The full auth config in auth.ts extends this with the Credentials provider.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const { pathname } = nextUrl

      const publicRoutes = ["/login", "/register", "/forgot-password", "/reset-password"]
      const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))
      const isApiAuth = pathname.startsWith("/api/auth")
      const isPortal = pathname.startsWith("/portal")
      const isBooking = pathname.startsWith("/book")
      const isEmbed = pathname.startsWith("/embed")
      const isHelp = pathname.startsWith("/help")
      const isPublicApi = pathname.startsWith("/api/public")
      const isWebhook = pathname.startsWith("/api/webhooks") || pathname.startsWith("/api/stripe/webhook")
      const isCron = pathname.startsWith("/api/cron")

      // Allow all public routes
      if (isApiAuth || isPortal || isBooking || isEmbed || isHelp || isPublicApi || isWebhook || isCron) {
        return true
      }

      // Auth pages: redirect logged-in users to dashboard
      if (isPublicRoute) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl))
        return true
      }

      // Everything else requires auth
      return isLoggedIn
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!
        token.organizationId = (user as any).organizationId
        token.role = (user as any).role
        token.firstName = (user as any).firstName
        token.lastName = (user as any).lastName
        token.avatar = (user as any).avatar
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as any).organizationId = token.organizationId as string
        ;(session.user as any).role = token.role as string
        ;(session.user as any).firstName = token.firstName as string
        ;(session.user as any).lastName = token.lastName as string
        ;(session.user as any).avatar = token.avatar as string | null
      }
      return session
    },
  },
  providers: [], // Added in auth.ts with Credentials
} satisfies NextAuthConfig

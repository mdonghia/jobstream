"use server"

import { hash, compare } from "bcryptjs"
import { v4 as uuidv4 } from "uuid"
import { prisma } from "@/lib/db"
import { signIn } from "@/lib/auth"
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "@/lib/validations"
import { generateSlug } from "@/lib/utils"
import { redirect } from "next/navigation"

export async function register(formData: FormData) {
  const raw = {
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    businessName: formData.get("businessName") as string,
  }

  const result = registerSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { firstName, lastName, email, password, businessName } = result.data

  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    return { error: "An account with this email already exists" }
  }

  const passwordHash = await hash(password, 12)

  let slug = generateSlug(businessName)
  const existingOrg = await prisma.organization.findUnique({
    where: { slug },
  })
  if (existingOrg) {
    slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`
  }

  const org = await prisma.organization.create({
    data: {
      name: businessName,
      slug,
      email,
    },
  })

  await prisma.user.create({
    data: {
      organizationId: org.id,
      email,
      passwordHash,
      firstName,
      lastName,
      role: "OWNER",
    },
  })

  await signIn("credentials", {
    email,
    password,
    redirectTo: "/",
  })
}

export async function login(formData: FormData) {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  }

  const result = loginSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  try {
    await signIn("credentials", {
      email: result.data.email,
      password: result.data.password,
      redirectTo: "/",
    })
  } catch (error: any) {
    if (error?.type === "CredentialsSignin") {
      return { error: "Invalid email or password" }
    }
    // Next.js redirect throws an error, so we need to re-throw it
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    return { error: "Invalid email or password" }
  }
}

export async function forgotPassword(formData: FormData) {
  const raw = { email: formData.get("email") as string }

  const result = forgotPasswordSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const user = await prisma.user.findUnique({
    where: { email: result.data.email },
  })

  // Always show success message (don't reveal if email exists)
  if (!user) {
    return { success: true }
  }

  // Delete any existing reset tokens for this user
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id },
  })

  const token = uuidv4()
  const tokenHash = await hash(token, 12)

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
  })

  // Send email with reset link
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`

  // If SendGrid is configured, send email. Otherwise, log to console.
  if (process.env.SENDGRID_API_KEY) {
    try {
      const sgMail = await import("@sendgrid/mail")
      sgMail.default.setApiKey(process.env.SENDGRID_API_KEY)
      await sgMail.default.send({
        to: user.email,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || "noreply@jobstream.app",
          name: process.env.SENDGRID_FROM_NAME || "JobStream",
        },
        subject: "Reset your password",
        html: `
          <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto;">
            <h2>Reset your password</h2>
            <p>Click the link below to reset your password. This link expires in 1 hour.</p>
            <a href="${resetUrl}" style="display: inline-block; background: #635BFF; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">Reset Password</a>
            <p style="color: #8898AA; font-size: 12px; margin-top: 24px;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      })
    } catch (e) {
      console.error("Failed to send reset email:", e)
    }
  } else {
    console.log(`[DEV] Password reset link: ${resetUrl}`)
  }

  return { success: true }
}

export async function resetPassword(formData: FormData) {
  const raw = {
    token: formData.get("token") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  }

  const result = resetPasswordSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  // Find all non-expired reset tokens
  const resetTokens = await prisma.passwordResetToken.findMany({
    where: {
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  })

  // Check each token against the provided one
  let matchedToken = null
  for (const rt of resetTokens) {
    const isValid = await compare(result.data.token, rt.tokenHash)
    if (isValid) {
      matchedToken = rt
      break
    }
  }

  if (!matchedToken) {
    return { error: "Invalid or expired reset link. Please request a new one." }
  }

  const passwordHash = await hash(result.data.password, 12)

  await prisma.user.update({
    where: { id: matchedToken.userId },
    data: { passwordHash },
  })

  await prisma.passwordResetToken.delete({
    where: { id: matchedToken.id },
  })

  redirect("/login?reset=success")
}

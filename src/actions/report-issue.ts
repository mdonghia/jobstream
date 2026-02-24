"use server"

import { requireAuth } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"

export async function submitIssue(formData: FormData) {
  try {
    const user = await requireAuth()

    const description = (formData.get("description") as string)?.trim()
    const category = (formData.get("category") as string)?.trim() || "Bug"
    const pageUrl = (formData.get("pageUrl") as string)?.trim() || ""
    const screenshot = formData.get("screenshot") as File | null

    if (!description) {
      return { error: "Description is required" }
    }

    // Upload screenshot if provided (non-fatal -- still send email if upload fails)
    let screenshotUrl: string | null = null
    if (screenshot && screenshot.size > 0) {
      try {
        const { uploadFile, getFileUrl } = await import("@/lib/s3")
        const sanitizedName = screenshot.name.replace(/[^a-zA-Z0-9.-]/g, "_")
        const fileName = `${Date.now()}-${sanitizedName}`
        const key = `${user.organizationId}/issues/${fileName}`
        const buffer = Buffer.from(await screenshot.arrayBuffer())
        const rawUrl = await uploadFile(buffer, key, screenshot.type)
        screenshotUrl = await getFileUrl(rawUrl)
      } catch (uploadErr) {
        console.error("Screenshot upload failed (continuing without it):", uploadErr)
      }
    }

    // Get organization name for context
    let orgName = "Unknown"
    try {
      const org = await prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: { name: true },
      })
      orgName = org?.name || "Unknown"
    } catch (orgErr) {
      console.error("Failed to fetch org name:", orgErr)
    }

    const subjectPreview = description.length > 50
      ? description.substring(0, 50) + "..."
      : description

    const subject = `[JobStream Issue] ${category}: ${subjectPreview}`

    const html = `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; color: #0A2540;">
        <h2 style="color: #635BFF; margin-bottom: 16px;">New Issue Report</h2>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 12px; font-weight: 600; vertical-align: top; width: 120px; color: #425466;">Category</td>
            <td style="padding: 8px 12px;">${category}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: 600; vertical-align: top; color: #425466;">Reported by</td>
            <td style="padding: 8px 12px;">${user.name} (${user.email})</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: 600; vertical-align: top; color: #425466;">Organization</td>
            <td style="padding: 8px 12px;">${orgName}</td>
          </tr>
          ${pageUrl ? `
          <tr>
            <td style="padding: 8px 12px; font-weight: 600; vertical-align: top; color: #425466;">Page URL</td>
            <td style="padding: 8px 12px;"><a href="${pageUrl}" style="color: #635BFF;">${pageUrl}</a></td>
          </tr>
          ` : ""}
        </table>

        <div style="margin-top: 20px; padding: 16px; background: #F6F8FA; border-radius: 8px;">
          <p style="font-weight: 600; color: #425466; margin: 0 0 8px 0;">Description</p>
          <p style="margin: 0; white-space: pre-wrap;">${description.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>
        </div>

        ${screenshotUrl ? `
        <div style="margin-top: 20px;">
          <p style="font-weight: 600; color: #425466; margin: 0 0 8px 0;">Screenshot</p>
          <a href="${screenshotUrl}" style="color: #635BFF;">View Screenshot</a>
        </div>
        ` : ""}
      </div>
    `

    // Send email via SendGrid
    if (process.env.SENDGRID_API_KEY) {
      try {
        const sgMail = await import("@sendgrid/mail")
        sgMail.default.setApiKey(process.env.SENDGRID_API_KEY)

        await sgMail.default.send({
          to: "mikedonghia@gmail.com",
          from: {
            email: process.env.SENDGRID_FROM_EMAIL || "noreply@jobstream.app",
            name: "JobStream",
          },
          subject,
          html,
        })
      } catch (e) {
        console.error("Failed to send issue report email:", e)
        return { error: "Failed to send report. Please try again." }
      }
    } else {
      console.log(`[Email] Would send issue report to mikedonghia@gmail.com: ${subject}`)
    }

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("submitIssue error:", error)
    return { error: "Failed to submit issue. Please try again." }
  }
}

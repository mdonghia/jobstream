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

    // Prepare screenshot as email attachment (no S3 needed)
    let screenshotAttachment: { content: string; filename: string; type: string } | null = null
    if (screenshot && screenshot.size > 0) {
      try {
        const buffer = Buffer.from(await screenshot.arrayBuffer())
        screenshotAttachment = {
          content: buffer.toString("base64"),
          filename: screenshot.name || "screenshot.png",
          type: screenshot.type || "image/png",
        }
      } catch (fileErr) {
        console.error("Failed to read screenshot file:", fileErr)
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

        ${screenshotAttachment ? `
        <div style="margin-top: 20px;">
          <p style="font-weight: 600; color: #425466; margin: 0 0 8px 0;">Screenshot</p>
          <p style="margin: 0; color: #8898AA; font-size: 13px;">See attached file: ${screenshotAttachment.filename}</p>
        </div>
        ` : ""}
      </div>
    `

    // Send email via SendGrid
    if (process.env.SENDGRID_API_KEY) {
      const sgMail = await import("@sendgrid/mail")
      sgMail.default.setApiKey(process.env.SENDGRID_API_KEY)

      const baseMsg = {
        to: "mikedonghia@gmail.com",
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || "noreply@jobstream.app",
          name: "JobStream",
        },
        subject,
        html,
      }

      let sent = false

      // Try with attachment first
      if (screenshotAttachment) {
        try {
          await sgMail.default.send({
            ...baseMsg,
            attachments: [
              {
                content: screenshotAttachment.content,
                filename: screenshotAttachment.filename,
                type: screenshotAttachment.type,
                disposition: "attachment",
              },
            ],
          })
          sent = true
        } catch (e) {
          console.error("Failed to send email with attachment, retrying without:", e)
        }
      }

      // Send without attachment (either no screenshot, or attachment send failed)
      if (!sent) {
        try {
          await sgMail.default.send(baseMsg)
        } catch (e) {
          console.error("Failed to send issue report email:", e)
          return { error: "Failed to send report. Please try again." }
        }
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

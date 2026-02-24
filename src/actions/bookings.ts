"use server"

import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"
import { bookingSchema } from "@/lib/validations"
import { DEFAULT_BUSINESS_HOURS } from "@/lib/constants"

// =============================================================================
// Types
// =============================================================================

type GetBookingsParams = {
  status?: string
  search?: string
  page?: number
  perPage?: number
}

// =============================================================================
// 1. getBookings - List bookings with filters
// =============================================================================

export async function getBookings(params: GetBookingsParams = {}) {
  try {
    const user = await requireAuth()
    const {
      status,
      search,
      page = 1,
      perPage = 25,
    } = params

    const where: any = { organizationId: user.organizationId }

    if (status && status !== "ALL") {
      where.status = status
    }

    if (search && search.trim()) {
      where.OR = [
        { customerName: { contains: search, mode: "insensitive" } },
        { customerEmail: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
      ]
    }

    const skip = (page - 1) * perPage

    const [total, bookings, statusCounts] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
        include: {
          service: {
            select: { id: true, name: true, defaultPrice: true },
          },
        },
      }),
      prisma.booking.groupBy({
        by: ["status"],
        where: { organizationId: user.organizationId },
        _count: true,
      }),
    ])

    const counts: Record<string, number> = {}
    statusCounts.forEach((s) => {
      counts[s.status] = s._count
    })

    return {
      bookings: bookings.map((b) => ({
        ...b,
        service: b.service
          ? { ...b.service, defaultPrice: Number(b.service.defaultPrice) }
          : null,
      })),
      total,
      page,
      totalPages: Math.ceil(total / perPage),
      statusCounts: counts,
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getBookings error:", error)
    return { error: "Failed to fetch bookings" }
  }
}

// =============================================================================
// 2. getBooking - Get a single booking
// =============================================================================

export async function getBooking(id: string) {
  try {
    const user = await requireAuth()

    const booking = await prisma.booking.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        service: {
          select: { id: true, name: true, defaultPrice: true, description: true },
        },
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
      },
    })

    if (!booking) return { error: "Booking not found" }

    return {
      booking: {
        ...booking,
        service: booking.service
          ? { ...booking.service, defaultPrice: Number(booking.service.defaultPrice) }
          : null,
      },
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getBooking error:", error)
    return { error: "Failed to fetch booking" }
  }
}

// =============================================================================
// 3. createPublicBooking - PUBLIC action (no auth required)
// =============================================================================

export async function createPublicBooking(data: {
  organizationSlug: string
  serviceName?: string
  serviceId?: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  addressLine1?: string
  city?: string
  state?: string
  zip?: string
  preferredDate?: string | Date
  preferredTime?: string
  preferredTimeSlot?: string
  message?: string
}) {
  try {
    if (!data.customerName || !data.customerEmail) {
      return { error: "Name and email are required" }
    }

    // Look up org by slug
    const org = await prisma.organization.findUnique({
      where: { slug: data.organizationSlug },
      select: { id: true },
    })

    if (!org) return { error: "Organization not found" }

    // Optionally look up service by ID or name
    let serviceId: string | null = null
    if (data.serviceId) {
      const service = await prisma.service.findFirst({
        where: {
          id: data.serviceId,
          organizationId: org.id,
          isActive: true,
        },
      })
      if (service) {
        serviceId = service.id
      }
    } else if (data.serviceName) {
      const service = await prisma.service.findFirst({
        where: {
          organizationId: org.id,
          name: { equals: data.serviceName, mode: "insensitive" },
          isActive: true,
        },
      })
      if (service) {
        serviceId = service.id
      }
    }

    // Check if customer already exists by email
    let customerId: string | null = null
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        organizationId: org.id,
        email: { equals: data.customerEmail, mode: "insensitive" },
      },
    })
    if (existingCustomer) {
      customerId = existingCustomer.id
    }

    const booking = await prisma.booking.create({
      data: {
        organizationId: org.id,
        serviceId,
        customerId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone || null,
        addressLine1: data.addressLine1 || null,
        city: data.city || null,
        state: data.state || null,
        zip: data.zip || null,
        address: [data.addressLine1, data.city, data.state, data.zip].filter(Boolean).join(", ") || null,
        preferredDate: data.preferredDate ? new Date(data.preferredDate) : null,
        preferredTime: data.preferredTime || null,
        preferredTimeSlot: data.preferredTimeSlot || null,
        message: data.message || null,
        status: "PENDING",
      },
    })

    return { bookingId: booking.id }
  } catch (error: any) {
    console.error("createPublicBooking error:", error)
    return { error: "Failed to create booking" }
  }
}

// =============================================================================
// 4. confirmBooking - Confirm a booking and create a job
// =============================================================================

export async function confirmBooking(
  id: string,
  data?: {
    assignedUserIds?: string[]
  }
) {
  try {
    const user = await requireAuth()

    const booking = await prisma.booking.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        service: {
          select: { id: true, name: true, defaultPrice: true },
        },
      },
    })

    if (!booking) return { error: "Booking not found" }
    if (booking.status !== "PENDING") {
      return { error: "Booking is not in a pending status" }
    }

    // Create or find customer
    let customerId = booking.customerId
    if (!customerId) {
      // Split customerName into first/last
      const nameParts = booking.customerName.trim().split(/\s+/)
      const firstName = nameParts[0] || booking.customerName
      const lastName = nameParts.slice(1).join(" ") || ""

      const newCustomer = await prisma.customer.create({
        data: {
          organizationId: user.organizationId,
          firstName,
          lastName,
          email: booking.customerEmail,
          phone: booking.customerPhone,
        },
      })
      customerId = newCustomer.id
    }

    // If booking has structured address, create a Property record
    let propertyId: string | null = null
    if (booking.addressLine1) {
      const property = await prisma.property.create({
        data: {
          customerId: customerId!,
          addressLine1: booking.addressLine1,
          city: booking.city || "",
          state: booking.state || "",
          zip: booking.zip || "",
          isPrimary: true,
        },
      })
      propertyId = property.id
    }

    // Get next job number
    const org = await prisma.organization.update({
      where: { id: user.organizationId },
      data: { nextJobNum: { increment: 1 } },
      select: { nextJobNum: true, jobPrefix: true, name: true },
    })
    const jobNumber = `${org.jobPrefix}-${org.nextJobNum - 1}`

    // Build job title including service name if available
    const jobTitle = booking.service
      ? `${booking.service.name} - ${booking.customerName}`
      : `Booking: ${booking.customerName}`

    // Create job and update booking in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const job = await tx.job.create({
        data: {
          organizationId: user.organizationId,
          customerId: customerId!,
          propertyId,
          jobNumber,
          title: jobTitle,
          description: booking.message || null,
          status: "SCHEDULED",
          priority: "MEDIUM",
          scheduledStart: new Date(0),
          scheduledEnd: new Date(0),
        },
      })

      // Create line item for the service if the booking has one
      if (booking.service) {
        await tx.jobLineItem.create({
          data: {
            jobId: job.id,
            serviceId: booking.service.id,
            name: booking.service.name,
            quantity: 1,
            unitPrice: booking.service.defaultPrice,
            total: booking.service.defaultPrice,
            taxable: true,
            sortOrder: 0,
          },
        })
      }

      // Create assignments
      if (data?.assignedUserIds && data.assignedUserIds.length > 0) {
        await tx.jobAssignment.createMany({
          data: data.assignedUserIds.map((userId) => ({
            jobId: job.id,
            userId,
            organizationId: user.organizationId,
          })),
        })
      }

      // Update booking
      await tx.booking.update({
        where: { id },
        data: {
          status: "CONFIRMED",
          confirmedJobId: job.id,
          customerId: customerId,
        },
      })

      return job
    })

    // Send confirmation email (best effort)
    const { isNotificationEnabled } = await import("@/lib/notification-check")

    if (await isNotificationEnabled(user.organizationId, "booking_confirmation", "email")) {
      if (booking.customerEmail && process.env.SENDGRID_API_KEY) {
        try {
          const sgMail = await import("@sendgrid/mail")
          sgMail.default.setApiKey(process.env.SENDGRID_API_KEY)
          await sgMail.default.send({
            to: booking.customerEmail,
            from: {
              email: process.env.SENDGRID_FROM_EMAIL || "noreply@jobstream.app",
              name: org.name || "JobStream",
            },
            subject: `Booking Confirmed - ${org.name}`,
            html: `
              <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto;">
                <h2>Hi ${booking.customerName},</h2>
                <p>Your booking with <strong>${org.name}</strong> has been confirmed!</p>
                <p>We will reach out to schedule your appointment.</p>
                <p>We look forward to seeing you.</p>
              </div>
            `,
          })

          await prisma.communicationLog.create({
            data: {
              organizationId: user.organizationId,
              customerId: customerId,
              type: "EMAIL",
              direction: "OUTBOUND",
              recipientAddress: booking.customerEmail,
              subject: `Booking Confirmed - ${org.name}`,
              content: `Booking confirmed for ${booking.customerName}`,
              status: "SENT",
              triggeredBy: "booking_confirmation",
            },
          })
        } catch (e) {
          console.error("Failed to send booking confirmation email:", e)
        }
      }
    }

    return { jobId: result.id }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("confirmBooking error:", error)
    return { error: "Failed to confirm booking" }
  }
}

// =============================================================================
// 5. declineBooking - Decline a booking with optional reason
// =============================================================================

export async function declineBooking(id: string, reason?: string) {
  try {
    const user = await requireAuth()

    const booking = await prisma.booking.findFirst({
      where: { id, organizationId: user.organizationId },
    })

    if (!booking) return { error: "Booking not found" }
    if (booking.status !== "PENDING") {
      return { error: "Booking is not in a pending status" }
    }

    await prisma.booking.update({
      where: { id },
      data: {
        status: "DECLINED",
        declineReason: reason || null,
      },
    })

    // Send decline email (best effort)
    const { isNotificationEnabled } = await import("@/lib/notification-check")

    if (await isNotificationEnabled(user.organizationId, "booking_decline", "email")) {
      if (booking.customerEmail && process.env.SENDGRID_API_KEY) {
        try {
          const org = await prisma.organization.findUnique({
            where: { id: user.organizationId },
            select: { name: true },
          })

          const sgMail = await import("@sendgrid/mail")
          sgMail.default.setApiKey(process.env.SENDGRID_API_KEY)
          await sgMail.default.send({
            to: booking.customerEmail,
            from: {
              email: process.env.SENDGRID_FROM_EMAIL || "noreply@jobstream.app",
              name: org?.name || "JobStream",
            },
            subject: `Booking Update - ${org?.name}`,
            html: `
              <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto;">
                <h2>Hi ${booking.customerName},</h2>
                <p>Unfortunately, we are unable to accommodate your booking request at this time.</p>
                ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
                <p>Please feel free to reach out to us to reschedule.</p>
              </div>
            `,
          })

          await prisma.communicationLog.create({
            data: {
              organizationId: user.organizationId,
              customerId: booking.customerId,
              type: "EMAIL",
              direction: "OUTBOUND",
              recipientAddress: booking.customerEmail,
              subject: `Booking Update - ${org?.name}`,
              content: `Booking declined for ${booking.customerName}${reason ? `: ${reason}` : ""}`,
              status: "SENT",
              triggeredBy: "booking_decline",
            },
          })
        } catch (e) {
          console.error("Failed to send booking decline email:", e)
        }
      }
    }

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("declineBooking error:", error)
    return { error: "Failed to decline booking" }
  }
}

// =============================================================================
// 6. getAvailableSlots - PUBLIC (no auth) - Get available time slots for a date
// =============================================================================

type BusinessHoursDay = { start: string; end: string; open: boolean }
type BusinessHoursMap = Record<string, BusinessHoursDay>

const DAY_MAP: Record<number, string> = {
  0: "sun",
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: "sat",
}

export async function getAvailableSlots(
  orgSlug: string,
  serviceId: string | null,
  date: string
) {
  try {
    // Find org by slug
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: {
        id: true,
        businessHours: true,
        bookingBufferMinutes: true,
        bookingSlotDuration: true,
      },
    })

    if (!org) return { error: "Organization not found" }

    // Determine service duration
    let serviceDuration = org.bookingSlotDuration // fallback
    if (serviceId) {
      const service = await prisma.service.findFirst({
        where: { id: serviceId, organizationId: org.id, isActive: true },
        select: { estimatedMinutes: true },
      })
      if (service?.estimatedMinutes) {
        serviceDuration = service.estimatedMinutes
      }
    }

    const bufferMinutes = org.bookingBufferMinutes

    // Parse date and get day of week
    const dateObj = new Date(date + "T00:00:00")
    const dayOfWeek = dateObj.getDay()
    const dayKey = DAY_MAP[dayOfWeek]

    // Get business hours for that day
    const businessHours = (org.businessHours as BusinessHoursMap | null) ??
      (DEFAULT_BUSINESS_HOURS as unknown as BusinessHoursMap)
    const dayHours = businessHours[dayKey]

    if (!dayHours || !dayHours.open) {
      return { slots: [] }
    }

    const openTime = dayHours.start // e.g. "09:00"
    const closeTime = dayHours.end // e.g. "17:00"

    // Get all non-cancelled jobs scheduled for that date
    const startOfDay = new Date(date + "T00:00:00")
    const endOfDay = new Date(date + "T23:59:59")

    const jobs = await prisma.job.findMany({
      where: {
        organizationId: org.id,
        scheduledStart: { gte: startOfDay, lte: endOfDay },
        status: { not: "CANCELLED" },
      },
      select: {
        scheduledStart: true,
        scheduledEnd: true,
      },
    })

    // Generate slots at 30-minute intervals from open to close
    const slots: string[] = []
    const [openH, openM] = openTime.split(":").map(Number)
    const [closeH, closeM] = closeTime.split(":").map(Number)
    const openMinutes = openH * 60 + openM
    const closeMinutes = closeH * 60 + closeM

    for (let slotStart = openMinutes; slotStart < closeMinutes; slotStart += 30) {
      const slotEnd = slotStart + serviceDuration + bufferMinutes

      // Check: the service + buffer must fit before closing
      if (slotStart + serviceDuration > closeMinutes) {
        break
      }

      // Check for conflicts with existing jobs
      const slotStartDate = new Date(date + "T00:00:00")
      slotStartDate.setMinutes(slotStartDate.getMinutes() + slotStart)

      const slotEndDate = new Date(date + "T00:00:00")
      slotEndDate.setMinutes(slotEndDate.getMinutes() + slotEnd)

      const hasConflict = jobs.some((job) => {
        const jobStart = new Date(job.scheduledStart)
        const jobEnd = new Date(job.scheduledEnd)
        // Overlap check: slot start is before job end AND slot end is after job start
        return slotStartDate < jobEnd && slotEndDate > jobStart
      })

      if (!hasConflict) {
        const hours = Math.floor(slotStart / 60)
        const mins = slotStart % 60
        slots.push(
          `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
        )
      }
    }

    return { slots }
  } catch (error: any) {
    console.error("getAvailableSlots error:", error)
    return { error: "Failed to get available slots" }
  }
}

// =============================================================================
// 7. getBookableServices - PUBLIC (no auth) - Get services available for booking
// =============================================================================

export async function getBookableServices(orgSlug: string) {
  try {
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: {
        id: true,
        bookingEnabled: true,
        bookingServices: true,
        bookingMaxAdvanceDays: true,
      },
    })

    if (!org) return { error: "Organization not found" }
    if (!org.bookingEnabled) return { error: "Online booking is not enabled" }

    // Build service filter
    const serviceFilter: any = {
      organizationId: org.id,
      isActive: true,
    }

    // If org has specific booking services configured, filter to only those
    if (
      org.bookingServices &&
      Array.isArray(org.bookingServices) &&
      (org.bookingServices as string[]).length > 0
    ) {
      serviceFilter.id = { in: org.bookingServices as string[] }
    }

    const services = await prisma.service.findMany({
      where: serviceFilter,
      select: {
        id: true,
        name: true,
        description: true,
        defaultPrice: true,
        estimatedMinutes: true,
      },
      orderBy: { sortOrder: "asc" },
    })

    // Serialize Decimal values before returning to client
    const serialized = services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      defaultPrice: Number(s.defaultPrice),
      estimatedMinutes: s.estimatedMinutes,
    }))

    return {
      services: serialized,
      bookingMaxAdvanceDays: org.bookingMaxAdvanceDays,
    }
  } catch (error: any) {
    console.error("getBookableServices error:", error)
    return { error: "Failed to get bookable services" }
  }
}

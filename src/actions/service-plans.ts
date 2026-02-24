"use server"

import { prisma } from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/auth-utils"

// =============================================================================
// Types
// =============================================================================

type CreateServicePlanData = {
  name: string
  description?: string
  visitFrequency: string
  includedVisits?: number
  serviceIds: string[]
  pricePerVisit?: number
  isActive?: boolean
}

type UpdateServicePlanData = Partial<CreateServicePlanData>

type GetSubscriptionsParams = {
  status?: string
  customerId?: string
}

// =============================================================================
// Valid frequency values
// =============================================================================

const VALID_FREQUENCIES = [
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "BIANNUALLY",
  "ANNUALLY",
]

// =============================================================================
// 1. getServicePlans - List all service plans for the organization
// =============================================================================

export async function getServicePlans() {
  try {
    const user = await requireAuth()

    const plans = await prisma.servicePlan.findMany({
      where: { organizationId: user.organizationId },
      include: {
        _count: { select: { subscriptions: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    // Serialize Decimal fields
    return {
      plans: JSON.parse(JSON.stringify(plans)),
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getServicePlans error:", error)
    return { error: "Failed to fetch service plans" }
  }
}

// =============================================================================
// 2. createServicePlan - Create a new service plan (OWNER/ADMIN only)
// =============================================================================

export async function createServicePlan(data: CreateServicePlanData) {
  try {
    const user = await requireRole(["OWNER", "ADMIN"])

    // Validate
    if (!data.name?.trim()) {
      return { error: "Plan name is required" }
    }
    if (!VALID_FREQUENCIES.includes(data.visitFrequency)) {
      return { error: "Invalid visit frequency" }
    }

    const plan = await prisma.servicePlan.create({
      data: {
        organizationId: user.organizationId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        visitFrequency: data.visitFrequency,
        includedVisits: data.includedVisits ?? null,
        serviceIds: data.serviceIds || [],
        pricePerVisit: data.pricePerVisit ?? null,
        isActive: data.isActive ?? true,
      },
    })

    return { plan: JSON.parse(JSON.stringify(plan)) }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("createServicePlan error:", error)
    return { error: "Failed to create service plan" }
  }
}

// =============================================================================
// 3. updateServicePlan - Update an existing plan (OWNER/ADMIN only)
// =============================================================================

export async function updateServicePlan(id: string, data: UpdateServicePlanData) {
  try {
    const user = await requireRole(["OWNER", "ADMIN"])

    // Verify ownership
    const existing = await prisma.servicePlan.findFirst({
      where: { id, organizationId: user.organizationId },
    })
    if (!existing) return { error: "Service plan not found" }

    if (data.visitFrequency && !VALID_FREQUENCIES.includes(data.visitFrequency)) {
      return { error: "Invalid visit frequency" }
    }

    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name.trim()
    if (data.description !== undefined)
      updateData.description = data.description?.trim() || null
    if (data.visitFrequency !== undefined)
      updateData.visitFrequency = data.visitFrequency
    if (data.includedVisits !== undefined)
      updateData.includedVisits = data.includedVisits ?? null
    if (data.serviceIds !== undefined) updateData.serviceIds = data.serviceIds
    if (data.pricePerVisit !== undefined)
      updateData.pricePerVisit = data.pricePerVisit ?? null
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    await prisma.servicePlan.update({
      where: { id },
      data: updateData,
    })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("updateServicePlan error:", error)
    return { error: "Failed to update service plan" }
  }
}

// =============================================================================
// 4. deleteServicePlan - Delete a plan (blocked if active subscribers)
// =============================================================================

export async function deleteServicePlan(id: string) {
  try {
    const user = await requireRole(["OWNER", "ADMIN"])

    const plan = await prisma.servicePlan.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        subscriptions: { where: { status: "ACTIVE" } },
      },
    })
    if (!plan) return { error: "Service plan not found" }

    if (plan.subscriptions.length > 0) {
      return { error: "Cannot delete plan with active subscribers" }
    }

    // Delete any remaining non-active subscriptions first, then the plan
    await prisma.$transaction([
      prisma.subscription.deleteMany({ where: { servicePlanId: id } }),
      prisma.servicePlan.delete({ where: { id } }),
    ])

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("deleteServicePlan error:", error)
    return { error: "Failed to delete service plan" }
  }
}

// =============================================================================
// 5. subscribeToPlan - Subscribe a customer to a service plan
// =============================================================================

export async function subscribeToPlan(planId: string, customerId: string) {
  try {
    const user = await requireAuth()

    // Verify plan belongs to org
    const plan = await prisma.servicePlan.findFirst({
      where: { id: planId, organizationId: user.organizationId, isActive: true },
    })
    if (!plan) return { error: "Service plan not found or inactive" }

    // Verify customer belongs to org
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, organizationId: user.organizationId },
    })
    if (!customer) return { error: "Customer not found" }

    // Look up services referenced by the plan to build line items
    const services = await prisma.service.findMany({
      where: {
        id: { in: plan.serviceIds },
        organizationId: user.organizationId,
      },
    })

    // Build line items from the plan's services
    const pricePerVisit = plan.pricePerVisit ? Number(plan.pricePerVisit) : 0
    const lineItems = services.map((svc, index) => {
      // If there's a pricePerVisit set, split evenly across services
      // Otherwise use each service's default price
      const unitPrice =
        pricePerVisit > 0 && services.length > 0
          ? pricePerVisit / services.length
          : Number(svc.defaultPrice)

      return {
        serviceId: svc.id,
        name: svc.name,
        description: svc.description,
        quantity: 1,
        unitPrice,
        total: unitPrice,
        taxable: svc.taxable,
        sortOrder: index,
      }
    })

    // Calculate tomorrow at 9 AM as the first scheduled date
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    const endTime = new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000) // +2 hours

    // Get next job number
    const org = await prisma.organization.update({
      where: { id: user.organizationId },
      data: { nextJobNum: { increment: 1 } },
      select: { nextJobNum: true, jobPrefix: true },
    })
    const jobNumber = `${org.jobPrefix}-${org.nextJobNum - 1}`

    // Create parent job and subscription in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the recurring parent job
      const parentJob = await tx.job.create({
        data: {
          organizationId: user.organizationId,
          customerId,
          jobNumber,
          title: `${plan.name} - ${customer.firstName} ${customer.lastName}`,
          description: plan.description || null,
          status: "SCHEDULED",
          priority: "MEDIUM",
          scheduledStart: tomorrow,
          scheduledEnd: endTime,
          isRecurring: true,
          recurrenceRule: plan.visitFrequency,
        },
      })

      // Create line items on the parent job
      if (lineItems.length > 0) {
        await tx.jobLineItem.createMany({
          data: lineItems.map((li) => ({
            jobId: parentJob.id,
            serviceId: li.serviceId,
            name: li.name,
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            total: li.total,
            taxable: li.taxable,
            sortOrder: li.sortOrder,
          })),
        })
      }

      // Create the subscription
      const subscription = await tx.subscription.create({
        data: {
          organizationId: user.organizationId,
          servicePlanId: planId,
          customerId,
          status: "ACTIVE",
          startDate: new Date(),
          nextVisitDate: tomorrow,
          parentJobId: parentJob.id,
        },
      })

      return { subscriptionId: subscription.id, parentJobId: parentJob.id }
    })

    return result
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("subscribeToPlan error:", error)
    return { error: "Failed to subscribe customer to plan" }
  }
}

// =============================================================================
// 6. cancelSubscription - Cancel a subscription and future jobs
// =============================================================================

export async function cancelSubscription(subscriptionId: string) {
  try {
    const user = await requireAuth()

    const subscription = await prisma.subscription.findFirst({
      where: { id: subscriptionId, organizationId: user.organizationId },
    })
    if (!subscription) return { error: "Subscription not found" }

    // Update subscription status
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
    })

    // Stop recurring on parent job
    if (subscription.parentJobId) {
      await prisma.job.update({
        where: { id: subscription.parentJobId },
        data: { isRecurring: false },
      })

      // Cancel future scheduled child jobs
      const result = await prisma.job.updateMany({
        where: {
          parentJobId: subscription.parentJobId,
          status: "SCHEDULED",
          scheduledStart: { gt: new Date() },
        },
        data: {
          status: "CANCELLED",
          cancelReason: "Subscription cancelled",
        },
      })

      return { cancelled: result.count }
    }

    return { cancelled: 0 }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("cancelSubscription error:", error)
    return { error: "Failed to cancel subscription" }
  }
}

// =============================================================================
// 7. pauseSubscription - Pause a subscription (stops new job generation)
// =============================================================================

export async function pauseSubscription(subscriptionId: string) {
  try {
    const user = await requireAuth()

    const subscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        organizationId: user.organizationId,
        status: "ACTIVE",
      },
    })
    if (!subscription) return { error: "Active subscription not found" }

    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: "PAUSED" },
    })

    // Stop recurring on parent job
    if (subscription.parentJobId) {
      await prisma.job.update({
        where: { id: subscription.parentJobId },
        data: { isRecurring: false },
      })
    }

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("pauseSubscription error:", error)
    return { error: "Failed to pause subscription" }
  }
}

// =============================================================================
// 8. resumeSubscription - Resume a paused subscription
// =============================================================================

export async function resumeSubscription(subscriptionId: string) {
  try {
    const user = await requireAuth()

    const subscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        organizationId: user.organizationId,
        status: "PAUSED",
      },
    })
    if (!subscription) return { error: "Paused subscription not found" }

    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: "ACTIVE" },
    })

    // Re-enable recurring on parent job
    if (subscription.parentJobId) {
      await prisma.job.update({
        where: { id: subscription.parentJobId },
        data: { isRecurring: true },
      })
    }

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("resumeSubscription error:", error)
    return { error: "Failed to resume subscription" }
  }
}

// =============================================================================
// 9. getSubscriptions - List subscriptions with optional filters
// =============================================================================

export async function getSubscriptions(params: GetSubscriptionsParams = {}) {
  try {
    const user = await requireAuth()

    const where: any = {
      organizationId: user.organizationId,
    }

    if (params.status && params.status !== "ALL") {
      where.status = params.status
    }

    if (params.customerId) {
      where.customerId = params.customerId
    }

    const subscriptions = await prisma.subscription.findMany({
      where,
      include: {
        servicePlan: {
          select: { id: true, name: true, visitFrequency: true, pricePerVisit: true },
        },
        customer: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return {
      subscriptions: JSON.parse(JSON.stringify(subscriptions)),
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getSubscriptions error:", error)
    return { error: "Failed to fetch subscriptions" }
  }
}

// =============================================================================
// 10. getCustomerSubscriptions - Get subscriptions for a specific customer
// =============================================================================

export async function getCustomerSubscriptions(customerId: string) {
  try {
    const user = await requireAuth()

    const subscriptions = await prisma.subscription.findMany({
      where: {
        customerId,
        organizationId: user.organizationId,
      },
      include: {
        servicePlan: {
          select: {
            id: true,
            name: true,
            visitFrequency: true,
            pricePerVisit: true,
            description: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return {
      subscriptions: JSON.parse(JSON.stringify(subscriptions)),
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getCustomerSubscriptions error:", error)
    return { error: "Failed to fetch customer subscriptions" }
  }
}

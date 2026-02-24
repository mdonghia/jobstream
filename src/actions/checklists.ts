"use server"

import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"

// =============================================================================
// 1. getChecklistTemplates - List all templates with items for the org
// =============================================================================

export async function getChecklistTemplates() {
  try {
    const user = await requireAuth()

    const templates = await prisma.checklistTemplate.findMany({
      where: { organizationId: user.organizationId },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
        },
        services: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Serialize to plain objects (strip Prisma metadata / Date objects)
    return { templates: JSON.parse(JSON.stringify(templates)) }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("getChecklistTemplates error:", error)
    return { error: "Failed to fetch checklist templates" }
  }
}

// =============================================================================
// 2. createChecklistTemplate - Create a new template with items
// =============================================================================

export async function createChecklistTemplate(data: {
  name: string
  items: string[]
  serviceIds?: string[]
}) {
  try {
    const user = await requireAuth()

    // Validation
    if (!data.name?.trim()) {
      return { error: "Template name is required" }
    }
    const filteredItems = data.items.filter((item) => item.trim())
    if (filteredItems.length === 0) {
      return { error: "At least one checklist item is required" }
    }

    const template = await prisma.checklistTemplate.create({
      data: {
        organizationId: user.organizationId,
        name: data.name.trim(),
        items: {
          create: filteredItems.map((label, index) => ({
            label: label.trim(),
            sortOrder: index,
          })),
        },
        ...(data.serviceIds && data.serviceIds.length > 0
          ? { services: { connect: data.serviceIds.map((id) => ({ id })) } }
          : {}),
      },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        services: { select: { id: true, name: true } },
      },
    })

    return { template: JSON.parse(JSON.stringify(template)) }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("createChecklistTemplate error:", error)
    return { error: "Failed to create checklist template" }
  }
}

// =============================================================================
// 3. updateChecklistTemplate - Update a template name and items
// =============================================================================

export async function updateChecklistTemplate(
  id: string,
  data: { name: string; items: string[]; serviceIds?: string[] }
) {
  try {
    const user = await requireAuth()

    // Validation
    if (!data.name?.trim()) {
      return { error: "Template name is required" }
    }
    const filteredItems = data.items.filter((item) => item.trim())
    if (filteredItems.length === 0) {
      return { error: "At least one checklist item is required" }
    }

    // Verify org ownership
    const existing = await prisma.checklistTemplate.findUnique({
      where: { id },
    })
    if (!existing || existing.organizationId !== user.organizationId) {
      return { error: "Template not found" }
    }

    // Transaction: update name + service links, delete old items, create new items
    await prisma.$transaction([
      prisma.checklistTemplate.update({
        where: { id },
        data: {
          name: data.name.trim(),
          ...(data.serviceIds !== undefined
            ? { services: { set: data.serviceIds.map((sid) => ({ id: sid })) } }
            : {}),
        },
      }),
      prisma.checklistTemplateItem.deleteMany({
        where: { templateId: id },
      }),
      ...filteredItems.map((label, index) =>
        prisma.checklistTemplateItem.create({
          data: {
            templateId: id,
            label: label.trim(),
            sortOrder: index,
          },
        })
      ),
    ])

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("updateChecklistTemplate error:", error)
    return { error: "Failed to update checklist template" }
  }
}

// =============================================================================
// 4. deleteChecklistTemplate - Delete a template (cascade deletes items)
// =============================================================================

export async function deleteChecklistTemplate(id: string) {
  try {
    const user = await requireAuth()

    // Verify org ownership
    const existing = await prisma.checklistTemplate.findUnique({
      where: { id },
    })
    if (!existing || existing.organizationId !== user.organizationId) {
      return { error: "Template not found" }
    }

    await prisma.checklistTemplate.delete({ where: { id } })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("deleteChecklistTemplate error:", error)
    return { error: "Failed to delete checklist template" }
  }
}

// =============================================================================
// 5. linkChecklistToService - Link a template to a service
// =============================================================================

export async function linkChecklistToService(
  templateId: string,
  serviceId: string
) {
  try {
    const user = await requireAuth()

    // Verify template belongs to org
    const template = await prisma.checklistTemplate.findUnique({
      where: { id: templateId },
    })
    if (!template || template.organizationId !== user.organizationId) {
      return { error: "Template not found" }
    }

    // Verify service belongs to org
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    })
    if (!service || service.organizationId !== user.organizationId) {
      return { error: "Service not found" }
    }

    await prisma.checklistTemplate.update({
      where: { id: templateId },
      data: {
        services: { connect: { id: serviceId } },
      },
    })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("linkChecklistToService error:", error)
    return { error: "Failed to link checklist to service" }
  }
}

// =============================================================================
// 6. unlinkChecklistFromService - Unlink a template from a service
// =============================================================================

export async function unlinkChecklistFromService(
  templateId: string,
  serviceId: string
) {
  try {
    const user = await requireAuth()

    // Verify template belongs to org
    const template = await prisma.checklistTemplate.findUnique({
      where: { id: templateId },
    })
    if (!template || template.organizationId !== user.organizationId) {
      return { error: "Template not found" }
    }

    await prisma.checklistTemplate.update({
      where: { id: templateId },
      data: {
        services: { disconnect: { id: serviceId } },
      },
    })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("unlinkChecklistFromService error:", error)
    return { error: "Failed to unlink checklist from service" }
  }
}

// =============================================================================
// 7. getChecklistsForServices - Get all checklist items for given services
// =============================================================================

export async function getChecklistsForServices(serviceIds: string[]) {
  try {
    const user = await requireAuth()

    if (!serviceIds.length) {
      return { items: [] }
    }

    const templates = await prisma.checklistTemplate.findMany({
      where: {
        organizationId: user.organizationId,
        services: {
          some: { id: { in: serviceIds } },
        },
      },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
        },
      },
    })

    // Deduplicate item labels across all matched templates
    const seen = new Set<string>()
    const items: string[] = []
    for (const template of templates) {
      for (const item of template.items) {
        if (!seen.has(item.label)) {
          seen.add(item.label)
          items.push(item.label)
        }
      }
    }

    return { items }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("getChecklistsForServices error:", error)
    return { error: "Failed to fetch checklists for services" }
  }
}

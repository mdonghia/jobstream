import { z } from "zod"

export const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
})

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email"),
})

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    token: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export const customerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

export const propertySchema = z.object({
  addressLine1: z.string().min(1, "Address is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/, "Enter a valid ZIP code"),
  notes: z.string().optional(),
  isPrimary: z.boolean().optional(),
})

export const serviceSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  defaultPrice: z.coerce.number().min(0, "Price must be positive"),
  unit: z.enum(["flat", "hourly", "per_sqft", "per_unit"]),
  taxable: z.boolean().default(true),
  isActive: z.boolean().default(true),
})

export const lineItemSchema = z.object({
  serviceId: z.string().optional(),
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0, "Price must be positive"),
  taxable: z.boolean().default(true),
})

export const quoteSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  propertyId: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
  customerMessage: z.string().optional(),
  internalNote: z.string().optional(),
  validUntil: z.coerce.date(),
})

export const jobSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  propertyId: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  scheduledStart: z.coerce.date(),
  scheduledEnd: z.coerce.date(),
  assignedUserIds: z.array(z.string()).optional(),
  checklistItems: z.array(z.string()).optional(),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().optional(),
  recurrenceEndDate: z.coerce.date().optional(),
  internalNote: z.string().optional(),
})

export const invoiceSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  jobId: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
  discountType: z.enum(["percentage", "fixed"]).optional(),
  discountValue: z.coerce.number().optional(),
  customerNote: z.string().optional(),
  internalNote: z.string().optional(),
  dueDate: z.coerce.date(),
})

export const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export const organizationSettingsSchema = z.object({
  name: z.string().min(1, "Business name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  timezone: z.string(),
  taxRate: z.coerce.number().min(0).max(100),
  currency: z.string().default("USD"),
  invoicePrefix: z.string().min(1),
  quotePrefix: z.string().min(1),
  jobPrefix: z.string().min(1),
  invoiceDueDays: z.coerce.number().int().min(1),
  quoteValidDays: z.coerce.number().int().min(1),
})

export const inviteTeamMemberSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  role: z.enum(["ADMIN", "TECHNICIAN"]),
  color: z.string().optional(),
})

export const bookingSchema = z.object({
  serviceId: z.string().optional(),
  customerName: z.string().min(1, "Name is required"),
  customerEmail: z.string().email("Please enter a valid email"),
  customerPhone: z.string().optional(),
  address: z.string().optional(),
  preferredDate: z.coerce.date().optional(),
  preferredTime: z.string().optional(),
  message: z.string().optional(),
})

export const reviewSchema = z.object({
  platform: z.string().min(1, "Platform is required"),
  reviewerName: z.string().min(1, "Reviewer name is required"),
  rating: z.coerce.number().int().min(1).max(5),
  content: z.string().optional(),
  reviewDate: z.coerce.date(),
  reviewUrl: z.string().url().optional().or(z.literal("")),
  customerId: z.string().optional(),
  jobId: z.string().optional(),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CustomerInput = z.infer<typeof customerSchema>
export type PropertyInput = z.infer<typeof propertySchema>
export type ServiceInput = z.infer<typeof serviceSchema>
export type LineItemInput = z.infer<typeof lineItemSchema>
export type QuoteInput = z.infer<typeof quoteSchema>
export type JobInput = z.infer<typeof jobSchema>
export type InvoiceInput = z.infer<typeof invoiceSchema>
export type BookingInput = z.infer<typeof bookingSchema>
export type ReviewInput = z.infer<typeof reviewSchema>

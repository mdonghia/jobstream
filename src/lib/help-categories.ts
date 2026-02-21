export type HelpCategory = {
  slug: string
  name: string
  icon: string // Lucide icon name
  description: string
  articleCount: number
}

export const helpCategories: HelpCategory[] = [
  {
    slug: "getting-started",
    name: "Getting Started",
    icon: "Rocket",
    description: "Set up your account and configure your business",
    articleCount: 5,
  },
  {
    slug: "managing-customers",
    name: "Managing Customers",
    icon: "Users",
    description: "Add, edit, and organize customers",
    articleCount: 5,
  },
  {
    slug: "quotes-estimates",
    name: "Quotes & Estimates",
    icon: "FileText",
    description: "Create, send, and manage quotes",
    articleCount: 5,
  },
  {
    slug: "scheduling-calendar",
    name: "Scheduling & Calendar",
    icon: "Calendar",
    description: "Schedule jobs and manage your calendar",
    articleCount: 5,
  },
  {
    slug: "job-management",
    name: "Job Management",
    icon: "Briefcase",
    description: "Track jobs from start to finish",
    articleCount: 5,
  },
  {
    slug: "invoicing-payments",
    name: "Invoicing & Payments",
    icon: "Receipt",
    description: "Create invoices and accept payments",
    articleCount: 6,
  },
  {
    slug: "client-portal",
    name: "Client Portal",
    icon: "Globe",
    description: "How customers interact online",
    articleCount: 5,
  },
  {
    slug: "online-booking",
    name: "Online Booking",
    icon: "CalendarPlus",
    description: "Set up your booking widget",
    articleCount: 3,
  },
  {
    slug: "communications",
    name: "Communications",
    icon: "MessageSquare",
    description: "SMS, email, and automation",
    articleCount: 5,
  },
  {
    slug: "reviews",
    name: "Reviews",
    icon: "Star",
    description: "Request and manage reviews",
    articleCount: 3,
  },
  {
    slug: "reports-analytics",
    name: "Reports & Analytics",
    icon: "BarChart3",
    description: "Understand business performance",
    articleCount: 3,
  },
  {
    slug: "account-settings",
    name: "Account & Settings",
    icon: "Settings",
    description: "Manage your account and preferences",
    articleCount: 4,
  },
]

export function getCategoryBySlug(slug: string): HelpCategory | undefined {
  return helpCategories.find((c) => c.slug === slug)
}

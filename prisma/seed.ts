import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { hash } from "bcryptjs"

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Seeding database...")

  // Create demo organization
  const org = await prisma.organization.create({
    data: {
      name: "Demo Service Co",
      slug: "demo-service-co",
      email: "demo@jobstream.app",
      phone: "5551234567",
      address: "123 Main Street",
      city: "Philadelphia",
      state: "PA",
      zip: "19103",
      timezone: "America/New_York",
      taxRate: 0.08,
      businessHours: {
        mon: { start: "08:00", end: "17:00", open: true },
        tue: { start: "08:00", end: "17:00", open: true },
        wed: { start: "08:00", end: "17:00", open: true },
        thu: { start: "08:00", end: "17:00", open: true },
        fri: { start: "08:00", end: "17:00", open: true },
        sat: { start: "08:00", end: "17:00", open: false },
        sun: { start: "08:00", end: "17:00", open: false },
      },
    },
  })

  // Create owner user
  const passwordHash = await hash("password123", 12)
  const owner = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: "demo@jobstream.app",
      passwordHash,
      firstName: "Mike",
      lastName: "Demo",
      role: "OWNER",
      color: "#635BFF",
    },
  })

  // Create technicians
  const tech1 = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: "sarah@jobstream.app",
      passwordHash,
      firstName: "Sarah",
      lastName: "Johnson",
      role: "TECHNICIAN",
      color: "#30D158",
    },
  })

  const tech2 = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: "james@jobstream.app",
      passwordHash,
      firstName: "James",
      lastName: "Wilson",
      role: "TECHNICIAN",
      color: "#F5A623",
    },
  })

  // Create customers
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        organizationId: org.id,
        firstName: "John",
        lastName: "Smith",
        email: "john.smith@example.com",
        phone: "5559876543",
        company: "Smith Residence",
        source: "referral",
        tags: ["Residential", "VIP"],
        properties: {
          create: {
            addressLine1: "456 Oak Avenue",
            city: "Philadelphia",
            state: "PA",
            zip: "19104",
            isPrimary: true,
            notes: "Ring doorbell twice",
          },
        },
      },
    }),
    prisma.customer.create({
      data: {
        organizationId: org.id,
        firstName: "Emily",
        lastName: "Davis",
        email: "emily.davis@example.com",
        phone: "5551112222",
        source: "google",
        tags: ["Residential"],
        properties: {
          create: {
            addressLine1: "789 Elm Street",
            city: "Philadelphia",
            state: "PA",
            zip: "19106",
            isPrimary: true,
          },
        },
      },
    }),
    prisma.customer.create({
      data: {
        organizationId: org.id,
        firstName: "Robert",
        lastName: "Martinez",
        email: "robert.m@example.com",
        phone: "5553334444",
        company: "Martinez Properties LLC",
        source: "website",
        tags: ["Commercial", "VIP"],
        properties: {
          create: [
            {
              addressLine1: "100 Market Street",
              addressLine2: "Suite 200",
              city: "Philadelphia",
              state: "PA",
              zip: "19107",
              isPrimary: true,
              notes: "Enter through back loading dock",
            },
            {
              addressLine1: "250 Broad Street",
              city: "Philadelphia",
              state: "PA",
              zip: "19102",
              notes: "Ask for building manager",
            },
          ],
        },
      },
    }),
    prisma.customer.create({
      data: {
        organizationId: org.id,
        firstName: "Lisa",
        lastName: "Chen",
        email: "lisa.chen@example.com",
        phone: "5555556666",
        source: "walk-in",
        tags: ["Residential"],
        properties: {
          create: {
            addressLine1: "321 Pine Road",
            city: "Philadelphia",
            state: "PA",
            zip: "19103",
            isPrimary: true,
          },
        },
      },
    }),
    prisma.customer.create({
      data: {
        organizationId: org.id,
        firstName: "David",
        lastName: "Brown",
        email: "david.brown@example.com",
        phone: "5557778888",
        source: "referral",
        tags: ["Residential", "Recurring"],
        properties: {
          create: {
            addressLine1: "555 Walnut Lane",
            city: "Philadelphia",
            state: "PA",
            zip: "19104",
            isPrimary: true,
            notes: "Gate code 4521",
          },
        },
      },
    }),
  ])

  // Create services
  const services = await Promise.all([
    prisma.service.create({
      data: {
        organizationId: org.id,
        name: "Standard Lawn Mowing",
        description: "Mow front and back yard, edge sidewalks, blow debris",
        category: "Lawn Care",
        defaultPrice: 75,
        unit: "flat",
        sortOrder: 1,
      },
    }),
    prisma.service.create({
      data: {
        organizationId: org.id,
        name: "Drain Cleaning",
        description: "Snake and clear clogged drains",
        category: "Plumbing",
        defaultPrice: 150,
        unit: "flat",
        sortOrder: 2,
      },
    }),
    prisma.service.create({
      data: {
        organizationId: org.id,
        name: "Faucet Installation",
        description: "Remove old faucet and install new one (customer provides faucet)",
        category: "Plumbing",
        defaultPrice: 200,
        unit: "flat",
        sortOrder: 3,
      },
    }),
    prisma.service.create({
      data: {
        organizationId: org.id,
        name: "General Handyman",
        description: "General handyman services billed by the hour",
        category: "General Maintenance",
        defaultPrice: 85,
        unit: "hourly",
        sortOrder: 4,
      },
    }),
    prisma.service.create({
      data: {
        organizationId: org.id,
        name: "Deep Cleaning",
        description: "Thorough cleaning of entire home including kitchen and bathrooms",
        category: "Cleaning",
        defaultPrice: 250,
        unit: "flat",
        sortOrder: 5,
      },
    }),
  ])

  console.log(`Created organization: ${org.name}`)
  console.log(`Created ${3} team members`)
  console.log(`Created ${customers.length} customers`)
  console.log(`Created ${services.length} services`)
  console.log("\nLogin with: demo@jobstream.app / password123")
  console.log("Seeding complete!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

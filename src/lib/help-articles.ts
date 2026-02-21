export type HelpArticle = {
  slug: string
  category: string
  title: string
  excerpt: string
  content: string
  lastUpdated: string
  readingTime: number
  keywords: string[]
}

export const helpArticles: HelpArticle[] = [
  // ============================================
  // GETTING STARTED
  // ============================================
  {
    slug: "welcome-to-jobstream",
    category: "getting-started",
    title: "Welcome to JobStream",
    excerpt: "A complete overview of what JobStream does and how to navigate the platform.",
    lastUpdated: "2026-02-01",
    readingTime: 4,
    keywords: ["overview", "introduction", "navigation", "getting started", "tour"],
    content: `## What Is JobStream?

JobStream is an all-in-one field service management platform designed to help home service businesses run more efficiently. Whether you operate a plumbing company, HVAC service, landscaping crew, or cleaning business, JobStream gives you the tools to manage every aspect of your operations from a single dashboard.

## Core Features

JobStream brings together the essential tools your business needs every day:

- **Customer Management** -- Store customer contact information, service addresses, and full job history in one place.
- **Quotes & Estimates** -- Build professional quotes, send them to customers for approval, and convert accepted quotes directly into jobs.
- **Scheduling & Calendar** -- Assign jobs to team members, view your schedule in multiple formats, and drag-and-drop to reschedule.
- **Job Tracking** -- Follow every job from creation through completion with status updates, notes, photos, and checklists.
- **Invoicing & Payments** -- Generate invoices from completed jobs, accept online payments through Stripe, and track outstanding balances.
- **Client Portal** -- Give your customers a self-service portal where they can view quotes, pay invoices, and request new work.
- **Communications** -- Send automated SMS and email notifications at key moments like appointment reminders and follow-ups.
- **Reviews** -- Automatically request reviews from satisfied customers after job completion.
- **Reports** -- Track revenue, job completion rates, and team performance with built-in analytics.

## Navigating the Dashboard

When you log in, you land on the main Dashboard. The left sidebar provides access to all major sections:

1. **Dashboard** -- Your home base with summary cards showing today's jobs, outstanding invoices, and recent activity.
2. **Schedule** -- The calendar view where you manage appointments and assignments.
3. **Customers** -- Your complete customer database.
4. **Quotes** -- All quotes organized by status.
5. **Jobs** -- Active and completed jobs.
6. **Invoices** -- All invoices and their payment statuses.
7. **Payments** -- Payment history and financial overview.
8. **Communications** -- Message logs and automation settings.
9. **Reviews** -- Review requests and responses.
10. **Reports** -- Business performance analytics.
11. **Settings** -- Account configuration, team management, and integrations.

## Next Steps

We recommend starting with these setup tasks in order: configure your business information, invite your team, add your services, and connect Stripe for payments. Each of these steps has its own detailed guide in this Help Center.`,
  },
  {
    slug: "setting-up-your-business",
    category: "getting-started",
    title: "Setting Up Your Business Profile",
    excerpt: "Configure your business name, address, logo, and other essential information.",
    lastUpdated: "2026-02-01",
    readingTime: 3,
    keywords: ["business profile", "settings", "setup", "company info", "logo"],
    content: `## Why Your Business Profile Matters

Your business profile information appears on quotes, invoices, and customer-facing communications. Taking a few minutes to set it up properly ensures your brand looks professional from day one.

## Accessing Business Settings

1. Click **Settings** in the left sidebar.
2. Select the **General** tab.
3. You will see the Business Information form.

## Required Information

Fill in the following fields to complete your profile:

- **Business Name** -- The legal or trade name of your company. This appears on all documents sent to customers.
- **Phone Number** -- Your main business phone number. Customers will see this on invoices and quotes.
- **Email Address** -- The primary email for your business. Replies to automated messages will go here.
- **Address** -- Your business mailing address. This appears in the header of quotes and invoices.

## Optional but Recommended

- **Business Logo** -- Upload your company logo (PNG or JPG, recommended size 400x400 pixels). Your logo appears on quotes, invoices, and the client portal.
- **Website** -- Your business website URL.
- **Tax ID / Business Number** -- If you need to display a tax registration number on invoices, enter it here.
- **Default Tax Rate** -- Set your standard tax rate so it auto-applies to new line items on quotes and invoices.
- **Business Hours** -- Define your standard operating hours. These are displayed on your online booking widget and client portal.

## Saving Your Changes

After filling in your information, click the **Save Changes** button at the bottom of the form. Your updates take effect immediately and will appear on any new documents you create.

### Tips

- Keep your business name consistent across all platforms for brand recognition.
- Use a high-resolution logo so it looks crisp on both screen and print.
- Double-check your email address since this is where customer replies are directed.`,
  },
  {
    slug: "inviting-your-team",
    category: "getting-started",
    title: "Inviting Your Team Members",
    excerpt: "Learn how to add team members to your JobStream account and assign roles.",
    lastUpdated: "2026-02-01",
    readingTime: 3,
    keywords: ["team", "invite", "members", "roles", "permissions", "staff"],
    content: `## Adding Team Members

JobStream is built for teams. Whether you have two technicians or twenty, adding your crew to the platform lets you assign jobs, track schedules, and communicate efficiently.

## How to Invite a New Team Member

1. Navigate to **Settings** in the left sidebar.
2. Click the **Team** tab.
3. Click the **Invite Member** button in the top right.
4. Fill in their **first name**, **last name**, and **email address**.
5. Select a **role** from the dropdown (see roles below).
6. Click **Send Invite**.

The team member will receive an email with a link to create their password and access the account.

## Understanding Roles

JobStream has three built-in roles that control what each team member can see and do:

### Admin
Admins have full access to everything in JobStream. They can manage team members, view reports, change settings, and perform any action. Assign this role to business owners and office managers.

### Manager
Managers can create and manage customers, quotes, jobs, and invoices. They can view the schedule for all team members and access reports. However, they cannot change account settings or manage team member roles.

### Technician
Technicians have a focused view designed for fieldwork. They can see their own assigned jobs, update job statuses, add notes and photos, and mark jobs as complete. They cannot create quotes or invoices, view financial reports, or access settings.

## Managing Existing Members

On the Team settings page, you can see all current members with their roles and statuses. Click any team member to:

- **Change their role** -- Promote or adjust permissions as needed.
- **Deactivate their account** -- If someone leaves your company, deactivate rather than delete to preserve their job history.
- **Resend the invite** -- If they did not receive or lost the original invitation email.

## Best Practices

- Start by inviting your office staff as Admins or Managers so they can help with data entry.
- Add field technicians once you have jobs and schedules ready for them to view.
- Review roles periodically to ensure permissions match current responsibilities.`,
  },
  {
    slug: "adding-your-services",
    category: "getting-started",
    title: "Adding Your Services",
    excerpt: "Set up your service catalog so you can quickly add line items to quotes and jobs.",
    lastUpdated: "2026-02-01",
    readingTime: 3,
    keywords: ["services", "catalog", "line items", "pricing", "setup"],
    content: `## What Are Services?

Services are the predefined line items that represent the work your business offers. By setting up a service catalog, you can quickly add items to quotes and invoices without retyping descriptions and prices every time.

## Setting Up Your Service Catalog

1. Go to **Settings** in the left sidebar.
2. Click the **Services** tab.
3. Click **Add Service** to create a new entry.

## Service Fields

Each service includes the following information:

- **Service Name** -- A clear, descriptive name such as "Standard Lawn Mowing" or "Furnace Inspection."
- **Description** -- A brief explanation of what the service includes. This description appears on quotes and invoices so customers understand what they are paying for.
- **Default Price** -- The standard price you charge for this service. You can always adjust the price on individual quotes or invoices.
- **Unit** -- How the service is measured. Common options include "per visit," "per hour," "per square foot," or "flat rate."
- **Tax** -- Whether this service is taxable. When enabled, the default tax rate from your business settings is applied.
- **Category** -- Optionally group services into categories like "Maintenance," "Repair," or "Installation" for easier organization.

## Using Services on Quotes and Invoices

Once your catalog is set up, adding services to documents is fast:

1. When creating a quote or invoice, click **Add Line Item**.
2. Start typing the service name in the search field.
3. Select the service from the dropdown.
4. The description, price, and tax settings auto-populate.
5. Adjust the quantity or price if needed for this specific job.

## Editing and Removing Services

You can edit any service at any time from the Services settings page. Changes apply to future quotes and invoices only -- existing documents are not affected. To remove a service you no longer offer, click the delete icon next to it. Deleting a service does not affect past quotes or invoices that referenced it.

### Tips

- Be specific with names: "2-Ton AC Unit Installation" is more helpful than "Installation."
- Review your pricing quarterly to keep rates current.
- Use categories to keep a large catalog organized.`,
  },
  {
    slug: "connecting-stripe",
    category: "getting-started",
    title: "Connecting Stripe for Payments",
    excerpt: "Set up Stripe Connect to accept online payments from your customers.",
    lastUpdated: "2026-02-01",
    readingTime: 4,
    keywords: ["stripe", "payments", "online payments", "connect", "setup", "credit card"],
    content: `## Why Connect Stripe?

Stripe Connect allows your customers to pay invoices online using credit cards, debit cards, and other payment methods directly through the JobStream client portal. When a customer receives an invoice, they can click a link and pay instantly -- no checks, no cash, no manual follow-up.

## Prerequisites

Before you begin, you need:

- A Stripe account. If you do not have one, you can create a free account at stripe.com.
- Your business bank account information for receiving payouts.
- Your tax identification number (EIN or SSN for sole proprietors).

## Step-by-Step Setup

1. Go to **Settings** in the left sidebar.
2. Click the **Payments** tab.
3. Click the **Connect with Stripe** button.
4. You will be redirected to Stripe's secure onboarding flow.
5. Log into your existing Stripe account, or create a new one.
6. Follow Stripe's prompts to verify your identity and business information.
7. Authorize JobStream to process payments on your behalf.
8. You will be redirected back to JobStream with a success confirmation.

## What Happens After Connection

Once connected, several things change in your JobStream experience:

- **Invoices get a "Pay Online" button** -- When customers view invoices in the client portal, they see a prominent payment button.
- **Payment status updates automatically** -- When a customer pays online, the invoice status changes to "Paid" in real time.
- **Payouts go to your bank** -- Stripe deposits funds directly into your connected bank account on a rolling basis (typically 2 business days).

## Fees

Stripe charges standard processing fees (typically 2.9% + 30 cents per transaction). JobStream does not add any additional fees on top of Stripe's charges. You can view detailed fee breakdowns in your Stripe dashboard.

## Disconnecting Stripe

If you need to disconnect your Stripe account, go to **Settings > Payments** and click **Disconnect**. Note that disconnecting prevents customers from paying online until you reconnect. Any pending payouts will still be processed by Stripe.

## Troubleshooting

- **"Connection failed" error** -- Make sure you completed all required steps in Stripe's onboarding. Check that your business information and bank account are verified in your Stripe dashboard.
- **Payments not appearing** -- Allow a few moments for webhooks to sync. If the issue persists, check your Stripe dashboard for the payment and contact support.
- **Payout delays** -- New Stripe accounts may have a 7-14 day initial payout delay. This is set by Stripe and shortens over time.`,
  },
  // ============================================
  // MANAGING CUSTOMERS
  // ============================================
  {
    slug: "adding-customers",
    category: "managing-customers",
    title: "Adding Customers",
    excerpt: "Learn how to manually create new customer records in JobStream.",
    lastUpdated: "2026-02-01",
    readingTime: 3,
    keywords: ["add customer", "create customer", "new customer", "contact"],
    content: `## Creating a New Customer

Adding customers is one of the first things you will do in JobStream. Every quote, job, and invoice is linked to a customer record, so building your customer database is essential.

## Step-by-Step Instructions

1. Click **Customers** in the left sidebar.
2. Click the **New Customer** button in the top right corner.
3. Fill in the customer details form.

## Required Fields

- **First Name** and **Last Name** -- The customer's full name. For commercial clients, you can enter the business contact person's name.
- **Email** or **Phone** -- At least one contact method is required. Email is needed if you plan to send quotes and invoices electronically.

## Optional Fields

- **Company Name** -- If this is a commercial or business customer, enter their company name here. It will appear on quotes and invoices alongside the contact name.
- **Phone Number** -- Mobile phone is preferred since it enables SMS notifications.
- **Service Address** -- The primary location where you perform work. This address is used for job scheduling and mapping.
- **Billing Address** -- If different from the service address, enter a separate billing address for invoices.
- **Notes** -- Add any internal notes about the customer such as gate codes, pet information, or scheduling preferences. These notes are visible only to your team.
- **Tags** -- Apply tags like "VIP," "Residential," or "Commercial" to organize and filter your customer list.

## Quick Create

If you are in the middle of creating a quote or job, you can add a new customer on the fly without leaving the form. Click the **+ New Customer** option in the customer dropdown, fill in the basics, and continue with your document.

## After Creating a Customer

Once saved, the customer appears in your customer list and is available for selection when creating quotes, jobs, and invoices. You can click into any customer to view their full profile, history, and associated documents.`,
  },
  {
    slug: "customer-detail-page",
    category: "managing-customers",
    title: "Understanding the Customer Detail Page",
    excerpt: "A tour of the customer profile page and all its tabs.",
    lastUpdated: "2026-02-01",
    readingTime: 3,
    keywords: ["customer profile", "customer detail", "tabs", "overview", "history"],
    content: `## Customer Detail Overview

The customer detail page is the central hub for everything related to a specific customer. Click any customer name in your customer list to access their profile.

## Profile Header

At the top of the page, you will see the customer's name, company (if applicable), and primary contact information. Quick action buttons let you create a new quote, job, or invoice directly from this page.

## Overview Tab

The Overview tab gives you a snapshot of the customer's relationship with your business:

- **Contact Information** -- Phone, email, and addresses.
- **Account Balance** -- Any outstanding invoice amounts.
- **Tags** -- Labels you have applied for organization.
- **Internal Notes** -- Private notes visible only to your team.

## Quotes Tab

This tab lists all quotes associated with the customer, sorted by date. Each quote shows its status (Draft, Sent, Approved, Declined, or Expired), total amount, and creation date. Click any quote to view its full details.

## Jobs Tab

View all jobs for this customer with their current status. You can quickly see which jobs are scheduled, in progress, or completed. This history helps you understand the full scope of work performed for the customer.

## Invoices Tab

All invoices sent to this customer are listed here with their payment status. You can see at a glance which invoices are paid, outstanding, or overdue. The running total of unpaid invoices appears at the top.

## Properties Tab

If the customer has multiple service locations, each property is listed with its address. You can add new properties, edit existing ones, or set a default service address.

## Communications Tab

A chronological log of all messages sent to or received from this customer, including automated notifications, manual emails, and SMS messages.

### Tips

- Use the customer detail page as your starting point when a customer calls -- everything you need to reference is in one place.
- Check the Jobs tab before creating a new quote to see if similar work has been done before.`,
  },
  {
    slug: "importing-customers-csv",
    category: "managing-customers",
    title: "Importing Customers from CSV",
    excerpt: "Bulk import your existing customer database using a CSV file.",
    lastUpdated: "2026-02-01",
    readingTime: 3,
    keywords: ["import", "csv", "bulk", "upload", "migrate", "spreadsheet"],
    content: `## When to Use CSV Import

If you are switching from another system or have customers in a spreadsheet, the CSV import feature lets you bring them all into JobStream at once instead of entering them one by one.

## Preparing Your CSV File

Before importing, format your spreadsheet with the following column headers:

- **first_name** (required)
- **last_name** (required)
- **email** (recommended)
- **phone** (recommended)
- **company_name** (optional)
- **street_address** (optional)
- **city** (optional)
- **state** (optional)
- **zip_code** (optional)
- **notes** (optional)

Save the file as a CSV (Comma Separated Values) format. Most spreadsheet applications like Excel, Google Sheets, and Numbers support exporting to CSV.

## Import Steps

1. Navigate to **Customers** in the left sidebar.
2. Click the **Import** button (upload icon) in the top right area.
3. Click **Choose File** and select your CSV file.
4. JobStream will show a preview of the data and attempt to map your columns automatically.
5. Review the column mapping. If any columns were not matched, use the dropdown to assign the correct field.
6. Click **Import** to begin processing.

## After Import

JobStream will display a summary showing how many customers were successfully imported and if any rows had errors. Common issues include:

- **Missing required fields** -- Rows without a first or last name are skipped.
- **Duplicate emails** -- If an email address already exists in your system, that row may be skipped or flagged for review.
- **Formatting issues** -- Phone numbers with unusual characters may need manual correction.

## Best Practices

- Always do a test import with a small file (5-10 rows) first to verify mapping works correctly.
- Clean up your spreadsheet before importing: remove empty rows, standardize phone number formats, and check for duplicates.
- After importing, spot-check several customer records to ensure data came through accurately.`,
  },
  {
    slug: "archiving-deleting-customers",
    category: "managing-customers",
    title: "Archiving vs. Deleting Customers",
    excerpt: "Understand when to archive a customer and when to delete them entirely.",
    lastUpdated: "2026-02-01",
    readingTime: 2,
    keywords: ["archive", "delete", "remove", "inactive", "cleanup"],
    content: `## Archiving vs. Deleting

JobStream offers two ways to remove customers from your active list, and choosing the right option matters for your records.

## Archiving a Customer

Archiving hides a customer from your main customer list without deleting any data. Use archiving when:

- The customer has moved away or no longer needs your services.
- You have completed past work for them and want to keep the history.
- You may re-engage with them in the future.

### How to Archive

1. Open the customer's detail page.
2. Click the **More Actions** menu (three dots) in the top right.
3. Select **Archive Customer**.
4. Confirm the action.

Archived customers do not appear in your default customer list or in dropdown searches when creating new documents. However, their past quotes, jobs, and invoices remain intact and accessible through filters.

### Restoring an Archived Customer

To bring back an archived customer, filter your customer list to show archived records, open the customer, and select **Restore Customer** from the More Actions menu.

## Deleting a Customer

Deleting permanently removes the customer record. Use deletion only when:

- The customer was created by mistake (typo, duplicate entry).
- No quotes, jobs, or invoices are associated with them.

### How to Delete

1. Open the customer's detail page.
2. Click the **More Actions** menu.
3. Select **Delete Customer**.
4. Confirm the permanent deletion.

**Important:** You cannot delete a customer who has associated quotes, jobs, or invoices. You must delete or reassign those documents first, or simply archive the customer instead.

## Our Recommendation

In most cases, archiving is the better choice. It keeps your records intact for tax purposes, job history reference, and potential future re-engagement. Only delete when you are certain the record is an error.`,
  },
  {
    slug: "managing-properties",
    category: "managing-customers",
    title: "Managing Customer Properties",
    excerpt: "Handle customers with multiple service addresses and properties.",
    lastUpdated: "2026-02-01",
    readingTime: 2,
    keywords: ["properties", "addresses", "service address", "multiple locations"],
    content: `## What Are Properties?

A property in JobStream represents a physical service location. While many customers have a single address, some customers -- especially property managers or commercial clients -- may have multiple locations where you perform work.

## Adding a Property

1. Open the customer's detail page.
2. Click the **Properties** tab.
3. Click **Add Property**.
4. Enter the property address and an optional label (for example, "Main Office," "Rental Unit A," or "Lake House").
5. Click **Save**.

## Setting a Default Property

If a customer has multiple properties, you can designate one as the default. The default property auto-populates when you create new quotes or jobs for that customer. To set a default:

1. On the Properties tab, find the property you want as default.
2. Click the **Set as Default** option.

## Using Properties on Jobs

When creating a job or quote for a customer with multiple properties, you will see a property dropdown in the form. Select the correct service location for that particular piece of work. This ensures:

- The correct address appears on the quote or invoice.
- The calendar shows the right location for route planning.
- Job history is organized by property.

## Editing and Removing Properties

Click any property to edit its address or label. To remove a property, click the delete icon. Note that you cannot delete a property that is currently linked to active jobs -- complete or reassign those jobs first.

### Tips

- Use descriptive labels so your team can easily identify which property a job is for.
- Keep addresses accurate and complete for reliable mapping and route planning.
- Review properties periodically to remove locations no longer serviced.`,
  },
  // ============================================
  // QUOTES & ESTIMATES
  // ============================================
  {
    slug: "creating-a-quote",
    category: "quotes-estimates",
    title: "Creating a Quote",
    excerpt: "Step-by-step walkthrough of building a professional quote in JobStream.",
    lastUpdated: "2026-02-01",
    readingTime: 4,
    keywords: ["create quote", "estimate", "quote builder", "line items", "pricing"],
    content: `## Overview

Quotes allow you to present your pricing to customers before work begins. A well-crafted quote sets clear expectations and helps close the deal.

## Creating a New Quote

1. Click **Quotes** in the left sidebar.
2. Click the **New Quote** button.
3. The quote builder form opens.

## Selecting a Customer

Start by choosing who the quote is for. Type the customer's name in the customer field and select them from the dropdown. If the customer is new, click **+ New Customer** to add them on the fly.

## Adding Line Items

Line items are the individual services or products on your quote:

1. Click **Add Line Item**.
2. Either select a service from your catalog or type a custom description.
3. Set the **quantity** and **unit price**.
4. If the item is taxable, check the tax box.
5. Repeat for each item you want to include.

The subtotal, tax, and total are calculated automatically as you add items.

## Setting Quote Details

- **Quote Number** -- Auto-generated but editable if you have a custom numbering system.
- **Quote Date** -- Defaults to today but can be adjusted.
- **Expiration Date** -- Set when the quote expires. After this date, the customer can no longer approve it through the portal. The default is 30 days.
- **Notes / Terms** -- Add any additional terms, disclaimers, or notes. These appear at the bottom of the quote document.

## Optional: Customer Message

You can add a personal message that appears at the top of the quote when the customer views it. This is a great place for a brief project summary or a thank-you note.

## Saving Your Quote

- **Save as Draft** -- Saves the quote without sending it. Use this when you are still working on the details.
- **Save and Send** -- Saves the quote and immediately sends it to the customer via email.

## Editing Quotes

You can edit any quote in Draft or Sent status. Once a quote is approved or declined by the customer, it becomes locked. If you need to make changes after approval, create a new version of the quote.

### Tips

- Include enough detail in line item descriptions so customers understand exactly what they are paying for.
- Set realistic expiration dates -- 14 to 30 days works well for most service businesses.
- Review the quote preview before sending to catch any errors.`,
  },
  {
    slug: "sending-quotes",
    category: "quotes-estimates",
    title: "Sending Quotes to Customers",
    excerpt: "Learn the different ways to deliver quotes and track their status.",
    lastUpdated: "2026-02-01",
    readingTime: 3,
    keywords: ["send quote", "email", "delivery", "tracking", "viewed"],
    content: `## Delivery Methods

JobStream gives you multiple ways to get quotes in front of your customers.

### Email Delivery

The most common method. When you click **Send Quote**, JobStream sends a professional email to the customer with:

- A summary of the quote including the total amount.
- A **View Quote** button that opens the full quote in the client portal.
- Your business name, logo, and contact information.

### Direct Link

Every quote has a unique URL that you can copy and share through any channel -- text message, social media, or chat. Find this link by opening the quote and clicking **Copy Link**.

### PDF Download

Click the **Download PDF** option on any quote to generate a printable document. You can then attach this to a manual email or print it for in-person delivery.

## Tracking Quote Status

After sending, JobStream tracks the quote through these statuses:

- **Sent** -- The email has been sent to the customer.
- **Viewed** -- The customer has opened the quote in the client portal. You will see the date and time they first viewed it.
- **Approved** -- The customer clicked the Approve button.
- **Declined** -- The customer clicked the Decline button and optionally left a reason.
- **Expired** -- The expiration date passed without a response.

## Resending a Quote

If a customer says they did not receive the quote or you want to send a reminder:

1. Open the quote.
2. Click **Resend** from the actions menu.
3. The customer receives a fresh email with the same quote link.

## Following Up

The Quotes list page lets you filter by status. Use the "Sent" filter to see quotes awaiting response. Sort by date to identify quotes that have been outstanding the longest and may need a follow-up call.

### Tips

- Follow up within 48 hours of sending if the customer has not viewed the quote.
- If a quote is declined, reach out to understand why and offer a revised version.
- Regularly review expired quotes to decide if they should be resent or archived.`,
  },
  {
    slug: "customer-approve-decline",
    category: "quotes-estimates",
    title: "Customer Approval and Decline Process",
    excerpt: "What happens when a customer approves or declines a quote.",
    lastUpdated: "2026-02-01",
    readingTime: 2,
    keywords: ["approve", "decline", "accept", "reject", "response"],
    content: `## How Customers Respond to Quotes

When a customer opens a quote in the client portal, they see the full details of the proposed work along with two action buttons: **Approve** and **Decline**.

## When a Customer Approves

1. The customer clicks **Approve** on the quote.
2. They may be asked to provide a digital signature (if you have this setting enabled).
3. The quote status changes to **Approved** in JobStream.
4. You receive a notification (email and in-app) that the quote was approved.
5. The quote is now ready to be converted into a job.

### What You Should Do Next

After approval, open the quote and click **Convert to Job** to create a job with all the details pre-filled. Schedule the job and assign it to a team member to get the work started.

## When a Customer Declines

1. The customer clicks **Decline** on the quote.
2. They can optionally provide a reason for declining.
3. The quote status changes to **Declined** in JobStream.
4. You receive a notification about the decline.

### What You Should Do Next

Review the decline reason if provided. Common reasons include pricing concerns, timing issues, or deciding to go with another provider. You can:

- **Reach out directly** to discuss their concerns and negotiate.
- **Create a revised quote** with adjusted pricing or scope.
- **Archive the quote** if the opportunity is lost.

## Customer Experience

The approval and decline experience is designed to be simple and mobile-friendly. Customers do not need to create an account to respond to a quote -- they simply click the link in the email and select their response.

## Notifications

You can customize which team members receive approval and decline notifications in **Settings > Communications**. By default, the person who created the quote is notified.`,
  },
  {
    slug: "converting-quote-to-job",
    category: "quotes-estimates",
    title: "Converting a Quote to a Job",
    excerpt: "Turn an approved quote into a scheduled job with one click.",
    lastUpdated: "2026-02-01",
    readingTime: 2,
    keywords: ["convert", "quote to job", "approved", "create job"],
    content: `## One-Click Conversion

One of the most time-saving features in JobStream is the ability to convert an approved quote directly into a job without re-entering any information.

## How to Convert

1. Open the approved quote (from the Quotes list or from a notification).
2. Click the **Convert to Job** button at the top of the quote.
3. A new job form opens with the following fields pre-populated:
   - Customer name and service address
   - Line items and descriptions from the quote
   - Quoted total amount
4. Add any additional job details:
   - **Scheduled Date and Time** -- When the work will be performed.
   - **Assigned Team Member** -- Who will do the work.
   - **Job Notes** -- Any internal instructions for the crew.
5. Click **Create Job** to finalize.

## What Happens to the Quote

After conversion, the original quote is marked with a "Converted" badge and linked to the new job. You can navigate between the quote and job easily from either record.

## Partial Conversions

If you only want to convert some line items from a quote (for example, splitting work into phases), you can remove line items from the job form before saving. The quote still shows as converted.

## Converting Without Approval

While the typical workflow is to convert after customer approval, you can convert a quote at any status. This is useful when a customer approves verbally over the phone and you want to get the job scheduled immediately.

### Tips

- Always schedule the job during conversion rather than creating an unscheduled job -- this keeps your calendar accurate.
- Review the line items after conversion to add any internal details that were not on the customer-facing quote.
- Use the link between the quote and job to quickly reference original pricing if questions arise.`,
  },
  {
    slug: "quote-expiration",
    category: "quotes-estimates",
    title: "Quote Expiration and Validity",
    excerpt: "How quote expiration works and what to do about expired quotes.",
    lastUpdated: "2026-02-01",
    readingTime: 2,
    keywords: ["expiration", "expired", "validity", "extend", "reopen"],
    content: `## How Expiration Works

Every quote in JobStream has an expiration date. After this date passes, the quote status automatically changes to **Expired** and the customer can no longer approve it through the client portal.

## Setting the Expiration Date

When creating a quote, the expiration date defaults to 30 days from the creation date. You can change this on a per-quote basis by editing the **Valid Until** field. Some businesses prefer shorter windows (7-14 days) to encourage faster decisions.

## Changing the Default Expiration Period

To change the default validity period for all new quotes:

1. Go to **Settings** in the left sidebar.
2. Click the **Quotes** section.
3. Adjust the **Default Quote Validity** field to your preferred number of days.
4. Click **Save**.

## What Happens When a Quote Expires

- The quote status changes to **Expired** in your quotes list.
- The customer sees a message that the quote is no longer valid if they try to access it in the portal.
- The quote's line items and pricing are preserved for your records.

## Reopening an Expired Quote

If a customer comes back after expiration and wants to move forward:

1. Open the expired quote.
2. Click **Reopen Quote** from the actions menu.
3. Update the expiration date to a new future date.
4. Review and adjust pricing if rates have changed since the original quote.
5. Resend the quote to the customer.

## Bulk Actions

On the Quotes list page, you can filter by "Expired" status to review all expired quotes at once. This is a good practice to do weekly so you can follow up with prospects or archive quotes that are no longer relevant.

### Tips

- Shorter expiration windows (7-14 days) create urgency and lead to faster decisions.
- Always update pricing when reopening old quotes to avoid honoring outdated rates.
- Use expired quotes as a follow-up opportunity -- a quick call can re-engage interested prospects.`,
  },
  // ============================================
  // SCHEDULING & CALENDAR
  // ============================================
  {
    slug: "calendar-views",
    category: "scheduling-calendar",
    title: "Calendar Views",
    excerpt: "Switch between month, week, day, and list views to see your schedule.",
    lastUpdated: "2026-02-01",
    readingTime: 3,
    keywords: ["calendar", "views", "month", "week", "day", "list", "schedule"],
    content: `## Overview

The JobStream calendar is the central hub for your team's schedule. It supports four different views so you can see your workload at whatever level of detail you need.

## Accessing the Calendar

Click **Schedule** in the left sidebar to open the calendar view.

## Month View

The month view provides a high-level overview of your entire month. Each day cell shows the number of jobs scheduled and a preview of the first few entries. This view is best for:

- Planning capacity weeks in advance.
- Spotting busy and light days at a glance.
- Identifying openings for new bookings.

Click any day to drill into the day view for full details.

## Week View

The week view shows seven days with time slots from your business hours. Jobs appear as blocks sized proportionally to their duration. This is the most commonly used view because it balances detail with context. Use it for:

- Planning the upcoming work week.
- Seeing how team members' schedules overlap.
- Identifying gaps for same-week scheduling.

## Day View

The day view shows a single day with detailed time slots. Each job block displays the customer name, service type, assigned team member, and job status. This view is ideal for:

- Managing today's active work.
- Dispatching and making real-time adjustments.
- Reviewing each appointment in detail.

## List View

The list view presents scheduled jobs in a simple table format, sorted by date and time. Each row shows the job title, customer, time, assigned team member, and status. This view is useful for:

- Printing a day's schedule for field crews.
- Quickly scanning upcoming work without the visual calendar layout.
- Exporting or reviewing data in a linear format.

## Switching Between Views

Use the view toggle buttons in the top right of the calendar. You can also use the date navigation arrows to move forward or backward in time within any view.

### Tips

- Start each morning in the day view to review today's workload.
- Use the week view for scheduling sessions with customers on the phone.
- The month view is best for monthly planning meetings.`,
  },
  {
    slug: "creating-jobs-from-calendar",
    category: "scheduling-calendar",
    title: "Creating Jobs from the Calendar",
    excerpt: "Quickly create new jobs by clicking directly on the calendar.",
    lastUpdated: "2026-02-01",
    readingTime: 2,
    keywords: ["create job", "calendar", "quick create", "schedule", "new job"],
    content: `## Quick-Create from Calendar

The fastest way to schedule a new job is to create it directly from the calendar. This method lets you choose the time slot first and fill in the details second.

## How to Quick-Create

1. Navigate to the **Schedule** page.
2. Switch to **Week** or **Day** view for the most precise time selection.
3. Click on the desired time slot in the calendar.
4. A quick-create popover appears with:
   - **Customer** dropdown -- search and select.
   - **Title** -- brief job description.
   - **Time** -- pre-filled based on where you clicked.
   - **Duration** -- set the expected length.
   - **Assign To** -- select a team member.
5. Click **Create** to save the job.

## Full Form Option

If you need to add more details (line items, notes, checklist), click **Open Full Form** in the quick-create popover. This opens the complete job creation form with the date and time already populated.

## Creating from the Button

You can also click the **New Job** button at the top of the calendar page. This opens the full job form where you manually set the date and time along with all other details.

## After Creation

The new job immediately appears on the calendar in the correct time slot. It is color-coded by status (blue for scheduled) and displays the customer name and job title.

### Tips

- Quick-create is perfect for simple, single-service jobs.
- Use the full form when jobs need detailed line items or custom checklists.
- Double-click an empty time slot as a shortcut for quick-create in some views.`,
  },
  {
    slug: "filtering-by-team-member",
    category: "scheduling-calendar",
    title: "Filtering by Team Member",
    excerpt: "View individual schedules and use color coding to tell team members apart.",
    lastUpdated: "2026-02-01",
    readingTime: 2,
    keywords: ["filter", "team member", "color", "schedule", "individual"],
    content: `## Why Filter?

When your team grows beyond two or three people, the calendar can get crowded. Filtering lets you focus on one team member's schedule at a time or compare specific team members side by side.

## Using the Team Filter

1. On the **Schedule** page, locate the team filter at the top of the calendar.
2. Click the filter to see a list of all team members.
3. Select one or more team members to display only their jobs.
4. Deselect all to show everyone's schedule again.

## Color Coding

Each team member is assigned a unique color that appears on their job blocks in the calendar. This makes it easy to visually distinguish who is assigned to which job without reading every label.

Colors are assigned automatically but can be customized:

1. Go to **Settings > Team**.
2. Click on a team member.
3. Select their calendar color from the color picker.
4. Click **Save**.

## Practical Uses

- **Dispatching**: Filter to a specific technician to see their availability before assigning a new job.
- **Workload balancing**: Compare two team members' schedules side by side to redistribute work.
- **Individual review**: Pull up one person's schedule during a 1-on-1 meeting.
- **Customer calls**: When a customer asks about their technician's schedule, quickly filter to that team member.

### Tips

- Choose distinct, high-contrast colors for team members so they are easy to tell apart.
- Use the "All" view occasionally to spot scheduling conflicts where two team members are booked at the same location.`,
  },
  {
    slug: "managing-unscheduled-jobs",
    category: "scheduling-calendar",
    title: "Managing Unscheduled Jobs",
    excerpt: "Use the unscheduled jobs sidebar to keep track of work that needs scheduling.",
    lastUpdated: "2026-02-01",
    readingTime: 2,
    keywords: ["unscheduled", "sidebar", "backlog", "pending", "schedule"],
    content: `## What Are Unscheduled Jobs?

Unscheduled jobs are jobs that have been created but do not yet have a date and time assigned. They live in a special sidebar panel on the calendar page, acting as a backlog of work that needs to be scheduled.

## Common Reasons for Unscheduled Jobs

- A quote was converted to a job but no date was set yet.
- A customer requested work but you are waiting to confirm availability.
- A job was created as a placeholder while details are being finalized.
- A previously scheduled job was unassigned and returned to the backlog.

## Viewing the Unscheduled Sidebar

On the **Schedule** page, look for the unscheduled jobs panel. It shows a list of all unscheduled jobs with:

- Customer name
- Job title
- Created date
- Priority (if set)

## Scheduling an Unscheduled Job

You have two options:

### Option 1: Drag and Drop
Click and drag a job from the unscheduled sidebar directly onto a time slot in the calendar. The job is instantly scheduled for that date and time.

### Option 2: Edit the Job
Click on the unscheduled job to open its details, then set the date, time, and team member assignment manually.

## Keeping the Backlog Clean

Review your unscheduled jobs regularly to prevent the list from growing stale. If a job is no longer needed, cancel or archive it. If it is waiting on the customer, add a note so you remember the context.

### Tips

- Check the unscheduled sidebar at the start of each day to see if anything can be fit into open slots.
- Sort or prioritize unscheduled jobs so the most urgent work gets scheduled first.
- Use the drag-and-drop method for speed when scheduling multiple jobs at once.`,
  },
  {
    slug: "drag-and-drop-scheduling",
    category: "scheduling-calendar",
    title: "Drag-and-Drop Scheduling",
    excerpt: "Reschedule, reassign, and resize jobs by dragging them on the calendar.",
    lastUpdated: "2026-02-01",
    readingTime: 2,
    keywords: ["drag and drop", "reschedule", "move", "resize", "reassign"],
    content: `## Drag-and-Drop Overview

The JobStream calendar supports full drag-and-drop interactions, making it fast to adjust your schedule without opening forms or editing individual jobs.

## Rescheduling a Job

To move a job to a different time or day:

1. Switch to **Week** or **Day** view.
2. Click and hold the job block on the calendar.
3. Drag it to the desired new time slot.
4. Release to drop it in place.

The job's scheduled date and time update immediately. The assigned team member and all other details remain unchanged.

## Reassigning a Job

If your calendar uses team columns (one column per team member), you can drag a job from one team member's column to another's. This reassigns the job while keeping the same time slot.

## Resizing a Job

To change a job's duration:

1. Hover over the bottom edge of a job block until you see the resize cursor.
2. Click and drag downward to extend the duration, or upward to shorten it.
3. Release to save the new duration.

This is useful when a job takes longer or shorter than originally estimated.

## Undo Changes

If you accidentally move or resize a job, use the undo notification that briefly appears after any drag action. Click **Undo** to revert the change.

## Limitations

- Drag-and-drop works best in Week and Day views. The Month view supports moving jobs between days but not precise time slots.
- Jobs with a "Completed" or "Cancelled" status cannot be dragged.
- Very short jobs (under 15 minutes) may be difficult to grab -- zoom into the Day view for precision.

### Tips

- Use drag-and-drop to quickly rearrange your morning schedule when priorities shift.
- Combine with team filtering to focus on one team member's schedule while rearranging.
- Keep the calendar zoomed to a comfortable level for easy grabbing of job blocks.`,
  },
  // ============================================
  // JOB MANAGEMENT
  // ============================================
  {
    slug: "creating-a-job",
    category: "job-management",
    title: "Creating a Job",
    excerpt: "Full walkthrough of the job creation form and all available options.",
    lastUpdated: "2026-02-01",
    readingTime: 4,
    keywords: ["create job", "new job", "job form", "line items"],
    content: `## Overview

Jobs are the core work units in JobStream. Every piece of work you do for a customer is tracked as a job, from the initial scheduling through completion and invoicing.

## How to Create a Job

1. Click **Jobs** in the left sidebar.
2. Click the **New Job** button.
3. Complete the job creation form.

## Job Form Fields

### Customer (Required)
Select the customer this job is for. Start typing their name to search. If the customer has multiple properties, select the correct service address.

### Job Title (Required)
A brief description of the work, such as "Quarterly HVAC Maintenance" or "Kitchen Faucet Replacement." This title appears on the calendar and in lists.

### Line Items
Add the services and materials for this job:

1. Click **Add Line Item**.
2. Search your service catalog or enter a custom description.
3. Set the quantity and price.
4. Add as many line items as needed.

### Schedule
- **Date** -- When the job should be performed.
- **Start Time** -- The appointment start time.
- **End Time / Duration** -- Either set an end time or a duration.

Leave these blank to create an unscheduled job that you can assign a time later.

### Assignment
Select one or more team members to perform the job. The job appears on their individual calendars.

### Notes
Add internal notes for your team. These are not visible to the customer and are perfect for instructions like "Enter through the side gate" or "Customer prefers morning appointments."

### Checklist
Add a checklist of items to complete during the job. Technicians can check these off as they work, ensuring nothing is missed.

### Tags
Apply tags for organization and filtering, such as "Urgent," "Warranty," or the service type.

## Saving the Job

Click **Create Job** to save. The job appears in your Jobs list and on the calendar (if scheduled). The customer does not receive a notification when a job is created unless you have automated notifications enabled.

### Tips

- Use descriptive titles -- your team should understand the job at a glance.
- Add checklists for complex jobs so technicians do not miss steps.
- Schedule and assign jobs during creation to keep your calendar up to date.`,
  },
  {
    slug: "job-lifecycle",
    category: "job-management",
    title: "Understanding the Job Lifecycle",
    excerpt: "Learn how jobs move through different statuses from creation to completion.",
    lastUpdated: "2026-02-01",
    readingTime: 3,
    keywords: ["status", "lifecycle", "workflow", "transitions", "stages"],
    content: `## Job Statuses

Every job in JobStream moves through a series of statuses that reflect its current stage. Understanding this lifecycle helps you manage your workload and keep customers informed.

## Status Flow

### 1. Draft
The job has been created but is not yet finalized. Use this status when you are still gathering details or waiting for confirmation. Draft jobs do not appear on the calendar.

### 2. Scheduled
The job has a confirmed date, time, and team member assignment. It appears on the calendar and the assigned team member can see it in their schedule. This is the most common starting status for jobs.

### 3. In Progress
A team member has started working on the job. This status indicates active on-site work. The transition to In Progress can happen automatically when a technician checks in, or manually by changing the status.

### 4. On Hold
The job has been paused for some reason -- waiting for parts, customer not home, weather delay, etc. On Hold jobs remain on the calendar but are visually distinct so you can see they need attention.

### 5. Completed
The work is finished. Completing a job triggers the option to create an invoice and can also trigger automated actions like review requests.

### 6. Cancelled
The job has been cancelled and will not be performed. Cancelled jobs are removed from the active calendar view but remain in your records for reference.

## Changing a Job's Status

You can change a job's status in several ways:

- **From the job detail page** -- Click the status badge and select the new status.
- **From the calendar** -- Right-click a job and choose the new status.
- **From the jobs list** -- Use the quick actions menu on any job row.

## Automated Transitions

Some transitions happen automatically based on your settings:

- When a technician uses the "On My Way" feature, the job can auto-transition to In Progress on arrival.
- When all checklist items are completed, you may see a prompt to mark the job as complete.

### Tips

- Keep job statuses current so your team and reports always reflect reality.
- Use the On Hold status instead of leaving stale In Progress jobs -- it signals that attention is needed.
- Review cancelled jobs monthly to spot patterns (pricing issues, scheduling problems).`,
  },
  {
    slug: "working-on-a-job",
    category: "job-management",
    title: "Working on a Job",
    excerpt: "Use checklists, notes, photos, and the On My Way feature during active jobs.",
    lastUpdated: "2026-02-01",
    readingTime: 3,
    keywords: ["checklist", "notes", "photos", "on my way", "field", "technician"],
    content: `## In the Field

Once a job is in progress, your field technicians can use JobStream to track their work, communicate with the office, and document the job.

## Checklists

If the job has a checklist, technicians see it prominently on the job detail page. They can tap each item to mark it complete as they work through the tasks. The office can see checklist progress in real time.

### Adding Checklist Items on the Fly

Technicians can add new checklist items while on-site if they discover additional work. This keeps the job record comprehensive and accurate.

## Job Notes

Notes serve two purposes:

- **Internal Notes** -- Visible only to your team. Technicians can add notes about what they found on-site, work performed, or issues encountered.
- **Customer-Facing Notes** -- These appear on the invoice or completion summary sent to the customer.

To add a note, open the job and type in the notes section. Notes are timestamped and attributed to the team member who wrote them.

## Photos

Documenting jobs with photos is valuable for before/after evidence, warranty documentation, and customer communication.

1. Open the job on a mobile device.
2. Tap the **Add Photo** button.
3. Take a new photo or upload from the device gallery.
4. Add an optional caption.
5. The photo is attached to the job record.

Photos can be included when completing the job and generating the invoice.

## The "On My Way" Feature

When a technician is heading to a job site, they can tap the **On My Way** button on their assigned job. This triggers:

- An automatic SMS or email to the customer letting them know the technician is en route.
- A status update visible to the office.
- An estimated arrival time (if location services are enabled).

This feature reduces "Where is my technician?" calls and improves the customer experience.

### Tips

- Encourage technicians to take before and after photos on every job for quality documentation.
- Use checklists to maintain consistent service quality across your team.
- The On My Way feature is one of the most appreciated features by customers -- make sure your team uses it.`,
  },
  {
    slug: "completing-a-job",
    category: "job-management",
    title: "Completing a Job",
    excerpt: "How to mark a job complete and the options for creating an invoice.",
    lastUpdated: "2026-02-01",
    readingTime: 2,
    keywords: ["complete", "finish", "close", "invoice", "completion"],
    content: `## Marking a Job Complete

When all work is finished, it is time to close out the job and move toward invoicing.

## How to Complete a Job

1. Open the job detail page.
2. Click the **Complete Job** button (or change the status to Completed).
3. The completion modal appears with several options.

## Completion Modal

The completion modal lets you handle the wrap-up in one step:

### Review Summary
- Confirm the line items and total match the work performed.
- Adjust quantities or add line items if the scope changed during the job.

### Add Completion Notes
- Write a summary of the work completed. These notes can be included on the invoice.
- Note any follow-up work recommended for future visits.

### Create Invoice
- Toggle **Create Invoice** to automatically generate an invoice from the job's line items.
- The invoice is created in Draft status so you can review it before sending.
- If you prefer to invoice later or are batching invoices, leave this unchecked.

### Request Review
- If you have review automation enabled, you can trigger a review request to the customer.
- This typically sends an email or SMS asking the customer to leave a review on Google, Yelp, or another platform.

## After Completion

Once completed, the job moves to the Completed status. It remains accessible in your job list and in the customer's history. The calendar slot shows the job as completed with a visual indicator.

If you created an invoice during completion, navigate to **Invoices** to review and send it to the customer.

### Tips

- Always review line items at completion -- unexpected additions or removals happen during fieldwork.
- Include detailed completion notes so future visits have context about what was done.
- Generate the invoice at completion time to speed up your billing cycle.`,
  },
  {
    slug: "recurring-jobs",
    category: "job-management",
    title: "Setting Up Recurring Jobs",
    excerpt: "Automate scheduling for repeat services like weekly maintenance.",
    lastUpdated: "2026-02-01",
    readingTime: 3,
    keywords: ["recurring", "repeat", "schedule", "automatic", "maintenance"],
    content: `## What Are Recurring Jobs?

Recurring jobs automatically generate new job entries on a set schedule. This is ideal for repeat services like weekly lawn care, monthly cleaning, quarterly inspections, or annual maintenance contracts.

## Creating a Recurring Job

1. Create a new job (or open an existing one).
2. In the scheduling section, enable the **Recurring** toggle.
3. Configure the recurrence pattern:

### Frequency Options
- **Daily** -- Every day or every X days.
- **Weekly** -- Select which days of the week (e.g., every Monday and Wednesday).
- **Bi-weekly** -- Every two weeks on the selected day.
- **Monthly** -- On a specific date or day of the month (e.g., the first Tuesday).
- **Custom** -- Set any interval you need.

### Duration
- **End Date** -- Specify when the recurrence should stop.
- **Number of Occurrences** -- Set a fixed number of repeat jobs (e.g., 12 visits).
- **No End Date** -- Continues indefinitely until you manually stop it.

4. Click **Save** to create the recurring series.

## How Recurring Jobs Appear

JobStream generates individual job instances from your recurring pattern. Each instance appears on the calendar as its own job that can be independently edited, reassigned, or rescheduled. The series is linked, so you can also make changes to all future occurrences at once.

## Editing a Recurring Series

When you open a recurring job and make changes, you will be asked:

- **This job only** -- Change applies to just this one occurrence.
- **This and all future jobs** -- Change applies to this and every future occurrence in the series.
- **All jobs in the series** -- Change applies to every occurrence, past and future.

## Cancelling a Recurring Series

To stop a recurring series, open any occurrence and select **Cancel Series** from the actions menu. You can choose to cancel only future occurrences or the entire series.

### Tips

- Set up recurring jobs for all your maintenance contract customers to ensure nothing falls through the cracks.
- Review recurring series quarterly to adjust for seasonal changes (for example, pausing lawn care in winter).
- Assign the same team member to recurring jobs for service consistency.`,
  },
  // ============================================
  // INVOICING & PAYMENTS
  // ============================================
  {
    slug: "creating-an-invoice",
    category: "invoicing-payments",
    title: "Creating an Invoice",
    excerpt: "Build invoices from scratch or generate them directly from completed jobs.",
    lastUpdated: "2026-02-01",
    readingTime: 3,
    keywords: ["create invoice", "new invoice", "billing", "line items"],
    content: `## Two Ways to Create Invoices

JobStream supports two invoice creation workflows: building one from scratch or generating it from a completed job.

## Creating from a Completed Job

The fastest method is creating an invoice directly from a job:

1. Open the completed job.
2. Click **Create Invoice** (or enable it in the completion modal).
3. The invoice form opens with all line items, customer information, and amounts pre-filled from the job.
4. Review the details and make any adjustments.
5. Click **Save** to create the invoice.

## Creating from Scratch

For billing that is not tied to a specific job (such as a consultation fee or deposit):

1. Click **Invoices** in the left sidebar.
2. Click **New Invoice**.
3. Select the customer.
4. Add line items with descriptions, quantities, and prices.
5. Set the invoice date and due date.
6. Click **Save**.

## Invoice Fields

- **Invoice Number** -- Auto-generated sequentially. You can customize the prefix in Settings.
- **Invoice Date** -- When the invoice was issued. Defaults to today.
- **Due Date** -- When payment is expected. Defaults to your configured payment terms (e.g., Net 30).
- **Line Items** -- Services and materials with quantities and prices.
- **Tax** -- Applied automatically based on your settings, or adjustable per line item.
- **Discount** -- Add a percentage or fixed amount discount if applicable.
- **Notes** -- Payment instructions or additional terms that appear on the invoice.

## Invoice Statuses

- **Draft** -- Created but not yet sent to the customer.
- **Sent** -- Delivered to the customer via email.
- **Viewed** -- The customer has opened the invoice in the portal.
- **Paid** -- Payment has been received (online or recorded manually).
- **Overdue** -- The due date has passed without payment.
- **Voided** -- The invoice has been cancelled and will not be collected.

### Tips

- Always create invoices from jobs when possible to maintain a clear paper trail.
- Review line items before sending, especially if the job scope changed during execution.
- Set up your default payment terms in Settings so due dates auto-populate correctly.`,
  },
  {
    slug: "sending-invoices",
    category: "invoicing-payments",
    title: "Sending Invoices",
    excerpt: "Deliver invoices by email and track when customers view them.",
    lastUpdated: "2026-02-01",
    readingTime: 2,
    keywords: ["send invoice", "email", "delivery", "tracking", "viewed"],
    content: `## Sending an Invoice

Once your invoice is ready, sending it is straightforward.

## Email Delivery

1. Open the invoice (or click **Save and Send** during creation).
2. Click the **Send** button.
3. JobStream sends a professional email to the customer containing:
   - Invoice summary with the amount due and due date.
   - A **View & Pay** button linking to the client portal.
   - Your business branding and contact information.

## Tracking

After sending, JobStream tracks customer interaction:

- **Sent** -- The email was successfully delivered.
- **Viewed** -- The customer opened the invoice in the client portal. You can see the date and time of first view.
- **Paid** -- Payment was made through the portal or recorded manually.

## Other Delivery Options

### Copy Link
Each invoice has a unique URL. Click **Copy Link** to share it via text message, chat, or any other channel.

### Download PDF
Generate a PDF of the invoice for printing or manual email attachment. Click **Download PDF** from the invoice actions menu.

## Resending

If a customer reports they did not receive the invoice:

1. Open the invoice.
2. Click **Resend** from the actions menu.
3. A fresh email is sent with the same invoice link.

## Batch Sending

If you have multiple draft invoices ready to go, you can send them in bulk from the Invoices list page. Select the invoices using the checkboxes, then click **Send Selected**.

### Tips

- Check the "Viewed" status before following up -- the customer may have seen it but not yet paid.
- Use the direct link option for customers who prefer text messages over email.
- Send invoices promptly after job completion for faster payment.`,
  },
  {
    slug: "recording-payments",
    category: "invoicing-payments",
    title: "Recording Manual Payments",
    excerpt: "How to record cash, check, or bank transfer payments in JobStream.",
    lastUpdated: "2026-02-01",
    readingTime: 2,
    keywords: ["record payment", "manual", "cash", "check", "bank transfer"],
    content: `## When to Record Manually

Not all payments come through the online portal. When a customer pays by cash, check, bank transfer, or another offline method, you need to record the payment manually in JobStream so your records stay accurate.

## How to Record a Payment

1. Open the invoice that was paid.
2. Click the **Record Payment** button.
3. Fill in the payment details:
   - **Amount** -- The amount received. This defaults to the full outstanding balance but can be adjusted for partial payments.
   - **Payment Method** -- Select from Cash, Check, Bank Transfer, or Other.
   - **Payment Date** -- When the payment was received. Defaults to today.
   - **Reference / Note** -- Optional. Enter a check number, transaction ID, or note.
4. Click **Save Payment**.

## After Recording

The invoice status updates based on the payment:

- **Paid** -- If the payment covers the full outstanding balance.
- **Partially Paid** -- If the payment is less than the total due. The remaining balance is displayed.

The payment also appears in the Payments section, and your revenue reports update automatically.

## Partial Payments

If a customer makes a partial payment, record the amount received. The invoice shows the remaining balance. You can record additional payments later until the invoice is fully paid.

## Editing or Deleting a Payment

If you made an error recording a payment:

1. Open the invoice.
2. Find the payment in the payment history section.
3. Click **Edit** to correct the amount, method, or date.
4. Or click **Delete** to remove the payment entirely.

### Tips

- Record payments the same day they are received to keep your books current.
- Always include a check number or reference for traceability.
- Use the payment method field accurately -- it helps with bank reconciliation.`,
  },
  {
    slug: "online-payments",
    category: "invoicing-payments",
    title: "Online Payments via Client Portal",
    excerpt: "How customers pay invoices online through Stripe.",
    lastUpdated: "2026-02-01",
    readingTime: 3,
    keywords: ["online payment", "stripe", "credit card", "portal", "pay online"],
    content: `## How Online Payments Work

When you have Stripe connected, customers can pay invoices directly through the JobStream client portal using their credit card, debit card, or other supported payment methods.

## The Customer Experience

1. The customer receives an invoice email with a **View & Pay** button.
2. Clicking the button opens the invoice in the client portal.
3. They review the invoice details and amount due.
4. They click the **Pay Now** button.
5. A secure Stripe payment form appears for entering card details.
6. After entering payment information, they click **Submit Payment**.
7. Payment is processed in real time.
8. A payment confirmation page is displayed and a receipt is emailed.

## What Happens in JobStream

When a customer pays online:

- The invoice status changes to **Paid** automatically.
- A payment record is created with all transaction details.
- You receive a notification that payment was received.
- The payment appears in your Payments dashboard and reports.
- Stripe deposits the funds into your connected bank account (typically within 2 business days).

## Supported Payment Methods

Through Stripe, customers can pay using:

- Visa, Mastercard, American Express, and Discover credit cards.
- Debit cards.
- Additional methods may be available depending on your Stripe configuration.

## Partial Payments

By default, customers pay the full invoice amount. If you want to allow partial payments, you can enable this in **Settings > Payments**. When enabled, customers can enter a custom amount to pay.

## Refunds

If you need to refund an online payment:

1. Open the paid invoice.
2. Click **Refund** from the payment actions.
3. Enter the refund amount (full or partial).
4. Confirm the refund.

The refund is processed through Stripe and the invoice status updates accordingly. Refunds typically appear on the customer's statement within 5-10 business days.

### Tips

- Keep Stripe connected and active so every invoice has a Pay Online option.
- Customers who can pay online tend to pay faster than those who receive paper invoices.
- Review the Stripe dashboard periodically for any failed charges or disputes.`,
  },
  {
    slug: "overdue-invoices",
    category: "invoicing-payments",
    title: "Handling Overdue Invoices",
    excerpt: "How JobStream detects overdue invoices and your options for follow-up.",
    lastUpdated: "2026-02-01",
    readingTime: 2,
    keywords: ["overdue", "late", "reminders", "follow up", "void", "past due"],
    content: `## How Overdue Detection Works

JobStream automatically changes an invoice's status to **Overdue** when the due date passes without full payment. This happens at the start of each day via an automated check.

## Identifying Overdue Invoices

Overdue invoices are highlighted in your Invoices list with a red status badge. You can also:

- **Filter by status** -- Select "Overdue" in the status filter to see all past-due invoices.
- **Dashboard alerts** -- The main dashboard shows a summary card with the total amount overdue.
- **Customer profile** -- Each customer's profile shows their outstanding balance including overdue amounts.

## Sending Payment Reminders

When an invoice is overdue, you can send a reminder:

1. Open the overdue invoice.
2. Click **Send Reminder** from the actions menu.
3. JobStream sends a polite but clear reminder email to the customer with the invoice details and a payment link.

You can also set up automated reminders in **Settings > Communications** to send reminders at intervals you define (e.g., 3 days, 7 days, and 14 days after the due date).

## Other Follow-Up Options

- **Phone call** -- Sometimes a personal call is the most effective approach, especially for larger amounts.
- **Adjust the due date** -- If the customer requested an extension, edit the due date to reflect the new agreement.
- **Apply a late fee** -- Add a line item to the invoice for a late payment fee if your terms allow it.

## Voiding an Invoice

If an invoice should no longer be collected (billing error, customer dispute resolved, work not performed):

1. Open the invoice.
2. Click **Void Invoice** from the actions menu.
3. Confirm the action.

Voided invoices remain in your records for auditing purposes but no longer count toward your receivables.

### Tips

- Set up automated reminders so you never have to manually chase payments.
- Follow up on overdue invoices within the first week -- the longer you wait, the harder it is to collect.
- Track your average days to payment using Reports to understand your collection efficiency.`,
  },
  {
    slug: "payments-dashboard",
    category: "invoicing-payments",
    title: "Using the Payments Dashboard",
    excerpt: "Overview of payment summary cards, filtering, and export options.",
    lastUpdated: "2026-02-01",
    readingTime: 2,
    keywords: ["payments", "dashboard", "summary", "filter", "export", "revenue"],
    content: `## Payments Dashboard Overview

The Payments page gives you a financial overview of all money coming into your business. Access it by clicking **Payments** in the left sidebar.

## Summary Cards

At the top of the page, you will see summary cards displaying key financial metrics:

- **Total Collected** -- The total amount of all payments received in the selected time period.
- **Outstanding** -- The total amount of unpaid invoices.
- **Overdue** -- The portion of outstanding invoices that are past their due date.
- **Average Days to Payment** -- How long it typically takes customers to pay after invoicing.

## Payment List

Below the summary cards, you will find a chronological list of all payments. Each entry shows:

- Customer name
- Invoice number
- Amount paid
- Payment method (online, cash, check, etc.)
- Payment date
- Status (successful, refunded, failed)

## Filtering and Sorting

Use the filter controls to narrow down the payment list:

- **Date Range** -- View payments from a specific period (this week, this month, custom range).
- **Payment Method** -- Filter by online, cash, check, or bank transfer.
- **Status** -- Show only successful, refunded, or failed payments.
- **Customer** -- Search for payments from a specific customer.
- **Team Member** -- Filter by the team member who was assigned to the related job.

## Exporting Data

Click the **Export** button to download your payment data as a CSV file. This is useful for:

- Importing into your accounting software (QuickBooks, Xero, FreshBooks).
- Creating custom financial reports.
- Sharing with your accountant or bookkeeper.
- Tax preparation.

The export includes all visible payments based on your current filters, so filter first if you need a specific subset.

### Tips

- Review the Payments dashboard weekly to catch any issues early.
- Use the date range filter to compare month-over-month payment trends.
- Export payment data monthly for your bookkeeper to streamline your accounting workflow.`,
  },
  // ============================================
  // CLIENT PORTAL
  // ============================================
  {
    slug: "how-portal-works",
    category: "client-portal",
    title: "How the Client Portal Works",
    excerpt: "Understand how customers access and use the self-service portal.",
    lastUpdated: "2026-02-01",
    readingTime: 3,
    keywords: ["portal", "client portal", "access", "customer portal", "self-service"],
    content: `## What Is the Client Portal?

The client portal is a secure, customer-facing website where your customers can view quotes, pay invoices, see job history, and request new services. It provides a professional, self-service experience that reduces phone calls and speeds up approvals and payments.

## How Customers Access the Portal

Customers access the portal through links in the emails they receive from you. Every quote email, invoice email, and appointment notification includes a link that opens the relevant document in the portal.

There is no separate login required by default. Each link contains a secure, unique token that authenticates the customer automatically. This means customers do not need to remember a username or password.

## Portal Verification

For added security, if a customer tries to access the portal directly (not through an email link), they can verify their identity by entering the email address associated with their account. JobStream sends a one-time verification code to that email, which the customer enters to gain access.

## What Customers See

Once in the portal, customers can:

- **View Quotes** -- See all quotes sent to them, with the ability to approve or decline.
- **View and Pay Invoices** -- See all invoices with amounts due and payment options.
- **View Job History** -- See a list of past and upcoming jobs.
- **Request New Service** -- Submit a request for new work (if you have this feature enabled).
- **View Business Info** -- See your company's contact information and business hours.

## Portal Branding

The client portal displays your business name and logo. It uses a clean, professional design that builds trust with your customers.

### Tips

- Mention the client portal to new customers so they know what to expect when they receive emails from you.
- The portal works on all devices, so customers can approve quotes and pay invoices from their phones.
- Enable the service request feature to make it easy for repeat customers to book new work.`,
  },
  {
    slug: "portal-dashboard",
    category: "client-portal",
    title: "The Portal Dashboard",
    excerpt: "A tour of what your customers see when they log into the portal.",
    lastUpdated: "2026-02-01",
    readingTime: 2,
    keywords: ["portal dashboard", "customer view", "portal home"],
    content: `## Portal Home Page

When a customer accesses the client portal, they see a clean dashboard tailored to their account. Here is what each section includes.

## Active Quotes

This section shows any pending quotes awaiting the customer's response. Each quote card displays:

- Quote number and date.
- Brief description of the proposed work.
- Total amount.
- Expiration date.
- **Approve** and **Decline** buttons.

If there are no pending quotes, this section is hidden.

## Outstanding Invoices

Any unpaid invoices are listed prominently with:

- Invoice number and date.
- Amount due and due date.
- A **Pay Now** button (if Stripe is connected).
- Overdue indicators for past-due invoices.

Customers can click into any invoice to see the full line-item details before paying.

## Upcoming Jobs

This section lists any scheduled jobs for the customer, showing:

- Job title and description.
- Scheduled date and time.
- Assigned team member name.

This gives customers visibility into when your team will be arriving.

## Job History

A chronological list of completed jobs, providing a record of all work performed. Customers can click into any job to see details, notes, and photos (if you have shared them).

## Request Service

If enabled, a **Request Service** button appears on the dashboard. Clicking it opens a simple form where the customer can describe what they need and submit a request for your team to review.

### Tips

- The portal automatically adjusts to show only what is relevant. A new customer with no history will see a simple, clean page.
- Encourage customers to check the portal for job schedules rather than calling your office.`,
  },
  {
    slug: "customers-paying-invoices",
    category: "client-portal",
    title: "Customers Paying Invoices Online",
    excerpt: "The step-by-step process customers follow to pay through the portal.",
    lastUpdated: "2026-02-01",
    readingTime: 2,
    keywords: ["pay invoice", "customer payment", "portal payment", "online pay"],
    content: `## Customer Payment Process

Here is exactly what your customer experiences when paying an invoice through the client portal.

## Step-by-Step from the Customer's Perspective

1. **Receive Email** -- The customer gets an email from your business with the invoice summary and a "View & Pay" button.
2. **Open Invoice** -- Clicking the button opens the full invoice in the client portal. They see all line items, tax, and the total amount due.
3. **Click Pay Now** -- The customer clicks the **Pay Now** button on the invoice.
4. **Enter Payment Details** -- A secure Stripe payment form appears. The customer enters their credit card or debit card information.
5. **Confirm Payment** -- They review the amount and click **Submit Payment**.
6. **Confirmation** -- A success page confirms the payment was processed. The customer also receives a payment receipt by email.

## Payment Receipt

After payment, the customer receives an email receipt containing:

- Your business name and contact information.
- Invoice number and payment date.
- Amount paid and payment method (last 4 digits of card).
- A link to view the paid invoice in the portal.

## For You (The Business)

When the customer completes payment, the following happens automatically:

- The invoice status changes to **Paid**.
- A payment record is created in your Payments section.
- You receive a notification.
- Revenue reports update in real time.

## Troubleshooting Customer Payment Issues

If a customer reports they cannot pay:

- **Card declined** -- Ask them to verify their card details or try a different card.
- **Page not loading** -- Confirm their internet connection and suggest a different browser.
- **Link expired** -- Resend the invoice from JobStream to generate a fresh link.

### Tips

- Test the payment flow yourself by creating a test invoice to understand the customer experience.
- Mention that payments are processed securely through Stripe to build customer confidence.`,
  },
  {
    slug: "customers-approving-quotes",
    category: "client-portal",
    title: "Customers Approving Quotes",
    excerpt: "How the quote approval and decline process works from the customer's side.",
    lastUpdated: "2026-02-01",
    readingTime: 2,
    keywords: ["approve quote", "customer approval", "portal approval", "accept quote"],
    content: `## Customer Quote Experience

Understanding what your customers see when they receive a quote helps you communicate better and close more deals.

## The Customer's View

1. **Email Arrives** -- The customer receives an email with a summary of your quote: the proposed services, total amount, and expiration date.
2. **Open Quote** -- They click the "View Quote" button to see the full details in the client portal.
3. **Review Details** -- The portal displays:
   - All line items with descriptions, quantities, and prices.
   - Subtotal, tax, and total amount.
   - Your company notes and terms.
   - The expiration date for the quote.
4. **Take Action** -- Two prominent buttons appear: **Approve** and **Decline**.

## Approving a Quote

When the customer clicks **Approve**:

- If digital signatures are enabled, they are prompted to draw or type their signature.
- A confirmation message appears thanking them for their approval.
- You receive an instant notification in JobStream.
- The quote status updates to "Approved."

## Declining a Quote

When the customer clicks **Decline**:

- An optional text field appears where they can explain why they are declining.
- A confirmation message appears.
- You receive a notification with the decline reason (if provided).
- The quote status updates to "Declined."

## No Account Required

Customers do not need to create an account or remember a password. The email link securely identifies them. This frictionless process leads to faster response rates.

## Mobile Friendly

The quote approval page is fully responsive and works well on phones and tablets. Customers can approve or decline from anywhere.

### Tips

- Write clear, detailed line item descriptions so customers can make confident decisions.
- Keep quotes concise -- overwhelming detail can slow down the approval process.
- Follow up within 24-48 hours if a customer has viewed but not responded to a quote.`,
  },
  {
    slug: "customer-service-requests",
    category: "client-portal",
    title: "Customer Service Requests",
    excerpt: "Allow customers to request new work through the client portal.",
    lastUpdated: "2026-02-01",
    readingTime: 2,
    keywords: ["service request", "new work", "customer request", "booking"],
    content: `## What Are Service Requests?

Service requests allow your existing customers to submit requests for new work directly through the client portal. Instead of calling or emailing, they fill out a simple form describing what they need, and you receive it as a new request in JobStream.

## Enabling Service Requests

1. Go to **Settings** in the left sidebar.
2. Navigate to the **Client Portal** section.
3. Toggle **Allow Service Requests** to on.
4. Optionally customize the request form fields.
5. Click **Save**.

## What the Customer Sees

In the client portal, an active **Request Service** button appears. Clicking it opens a form with:

- **Service Type** -- A dropdown of your available services (if configured), or a free-text field.
- **Description** -- A text area where the customer describes the work they need.
- **Preferred Date** -- An optional date picker for when they would like the work done.
- **Urgency** -- Optional indication of how urgent the request is.
- **Photos** -- The ability to upload photos showing the issue or area.

## How You Receive Requests

When a customer submits a request:

1. A notification appears in JobStream.
2. The request shows up in your **Jobs** section with a "Requested" status.
3. The customer's details and request information are pre-filled.

## Managing Requests

You have several options for each request:

- **Convert to Quote** -- Create a quote based on the request and send it for approval.
- **Convert to Job** -- If pricing is already known, create a job directly and schedule it.
- **Contact Customer** -- Reach out for more details before proceeding.
- **Decline** -- If you cannot fulfill the request, decline it with an explanation.

### Tips

- Enable service requests to give repeat customers a convenient self-service channel.
- Respond to requests within a few hours to demonstrate excellent service.
- Use the request as a starting point for a quote when the scope needs clarification.`,
  },
  // ============================================
  // ONLINE BOOKING
  // ============================================
  {
    slug: "setting-up-booking-widget",
    category: "online-booking",
    title: "Setting Up the Booking Widget",
    excerpt: "Configure your online booking widget so customers can book services from your website.",
    lastUpdated: "2026-02-01",
    readingTime: 3,
    keywords: ["booking widget", "online booking", "configuration", "setup"],
    content: `## What Is the Booking Widget?

The booking widget is an embeddable form that you can add to your website, social media pages, or landing pages. It allows potential customers to select a service, choose an available time slot, and submit a booking request directly to your JobStream account.

## Configuring the Widget

1. Go to **Settings** in the left sidebar.
2. Click the **Online Booking** tab.
3. Configure the following options:

### Available Services
Select which services from your catalog should appear in the booking widget. You might want to offer a subset of your services for online booking while handling complex projects through direct consultation.

### Available Time Slots
Define when customers can book:

- **Business Hours** -- Use your standard business hours as the available window.
- **Custom Hours** -- Set specific booking hours that differ from your business hours.
- **Buffer Time** -- Add buffer time between appointments to allow for travel and preparation.
- **Slot Duration** -- Define the default appointment length.

### Booking Lead Time
Set the minimum advance notice required for bookings. For example, requiring 24 hours ensures you are not caught off guard by same-day bookings.

### Auto-Confirm vs. Manual Review
Choose whether bookings are automatically confirmed or held for your review:

- **Auto-Confirm** -- Bookings are immediately confirmed and added to your calendar. Best for simple services with predictable durations.
- **Manual Review** -- Bookings create a pending request for you to review, contact the customer if needed, and confirm or decline. Best for services that require assessment.

### Customer Information
Choose which fields customers must fill out: name, email, phone, address, and any custom questions you want to ask.

## Preview and Embed Code

After configuring, click **Preview** to see how the widget looks. When you are satisfied, click **Get Embed Code** to copy the HTML snippet for your website.

### Tips

- Start with Manual Review until you are comfortable with the booking volume and types of requests.
- Keep the service list short and clear -- too many options can overwhelm visitors.
- Set reasonable buffer times to avoid back-to-back bookings that could cause delays.`,
  },
  {
    slug: "embedding-on-website",
    category: "online-booking",
    title: "Embedding the Booking Widget on Your Website",
    excerpt: "Step-by-step instructions for adding the widget to WordPress, Squarespace, Wix, and HTML sites.",
    lastUpdated: "2026-02-01",
    readingTime: 3,
    keywords: ["embed", "website", "wordpress", "squarespace", "wix", "html"],
    content: `## Getting Your Embed Code

1. Go to **Settings > Online Booking** in JobStream.
2. Click **Get Embed Code**.
3. Copy the provided HTML snippet.

The snippet looks similar to this:

\`\`\`html
<div id="jobstream-booking"></div>
<script src="https://app.jobstream.com/booking/widget.js" data-id="YOUR_ID"></script>
\`\`\`

## WordPress

### Using the Custom HTML Block

1. Open the page where you want the booking widget in the WordPress editor.
2. Click the **+** button to add a new block.
3. Search for and select **Custom HTML**.
4. Paste the embed code into the HTML block.
5. Click **Preview** to verify it displays correctly.
6. Click **Publish** or **Update** to save.

### Using a Widget Area

If you want the booking form in a sidebar or footer, go to **Appearance > Widgets**, add a Custom HTML widget to the desired area, and paste the embed code.

## Squarespace

1. Open the page editor for the page you want.
2. Click an insertion point and choose **Code** from the block menu.
3. Paste the embed code into the code block.
4. Make sure the **Display Source** option is unchecked.
5. Click **Save** and preview the page.

## Wix

1. Open the Wix Editor for your site.
2. Click **Add** (+) in the left panel.
3. Select **Embed Code > Custom Element** or **Embed a Site**.
4. For Custom Element, paste the JavaScript URL. For HTML iframe, use the provided iframe version of the embed code.
5. Position and resize the widget on your page.
6. Click **Publish**.

## Plain HTML

For any custom-built website, simply paste the embed code into the HTML of the desired page, ideally within the main content area where you want the form to appear.

## Styling

The widget is designed to adapt to your website's width. It has a neutral, professional design that works with most website themes. If you need custom styling, you can override the widget's CSS classes in your website's stylesheet.

### Tips

- Place the booking widget on a dedicated "Book Now" page linked from your navigation menu.
- Test the widget on mobile devices to ensure it is responsive on your site.
- Add a call-to-action heading above the widget like "Schedule Your Service Online."`,
  },
  {
    slug: "managing-booking-requests",
    category: "online-booking",
    title: "Managing Booking Requests",
    excerpt: "Review, confirm, decline, or contact customers about their booking requests.",
    lastUpdated: "2026-02-01",
    readingTime: 2,
    keywords: ["booking requests", "confirm", "decline", "manage", "review"],
    content: `## Receiving Booking Requests

When a customer submits a booking through your widget, you are notified immediately via in-app notification and email. The request appears in your **Bookings** section.

## Reviewing a Request

Each booking request shows:

- Customer name and contact information.
- Selected service.
- Requested date and time.
- Any notes or answers to custom questions the customer provided.

## Taking Action

You have three options for each booking request:

### Confirm
Click **Confirm** to accept the booking. This:
- Creates a job on your calendar for the requested date and time.
- Sends a confirmation email to the customer with the appointment details.
- Assigns the job to the default team member (or one you select).

### Decline
Click **Decline** if you cannot fulfill the request. You can:
- Add a reason for declining.
- Suggest alternative dates or times.
- The customer receives an email explaining the decline with any message you include.

### Contact Customer
Click **Contact** to reach out before making a decision. This is useful when:
- You need more details about the job scope.
- The requested time slot is not ideal and you want to propose an alternative.
- You want to provide a quote before confirming.

## Auto-Confirmed Bookings

If you enabled auto-confirmation in your booking settings, requests skip the review step and immediately create confirmed jobs on your calendar. You still receive a notification for each new booking.

## Booking Analytics

The Bookings section shows metrics on your booking activity:
- Total bookings received.
- Confirmation rate.
- Most popular services.
- Peak booking days and times.

### Tips

- Respond to booking requests within one hour during business hours for the best customer experience.
- Use the decline message to offer alternatives rather than just saying no.
- Review your booking analytics monthly to optimize your available time slots.`,
  },
  // ============================================
  // COMMUNICATIONS
  // ============================================
  {
    slug: "automated-messages-overview",
    category: "communications",
    title: "Automated Messages Overview",
    excerpt: "Understand the automated messages JobStream can send on your behalf.",
    lastUpdated: "2026-02-01",
    readingTime: 3,
    keywords: ["automation", "automated", "messages", "notifications", "sms", "email"],
    content: `## What Are Automated Messages?

Automated messages are notifications that JobStream sends to your customers at key moments without any manual action from you. They keep customers informed, reduce no-shows, and maintain a professional communication cadence.

## Types of Automated Messages

### Appointment Reminders
Sent before a scheduled job to remind the customer of the upcoming visit. You can configure how far in advance the reminder goes out (e.g., 24 hours, 2 hours).

### Quote Sent Notification
When you send a new quote, the customer receives an email with a summary and a link to view the full quote in the portal.

### Invoice Sent Notification
Similar to quote notifications, customers receive an email with the invoice summary and a link to view and pay.

### On My Way Alert
When a technician taps "On My Way," the customer receives an SMS or email letting them know the tech is heading to their location.

### Job Completed Summary
After a job is marked complete, the customer can receive a summary of the work performed, including any notes or photos.

### Payment Confirmation
When a payment is received (online or manual), the customer gets a receipt confirmation.

### Payment Reminder
For overdue invoices, automated reminders nudge customers to pay. These can be sent at intervals you define.

### Review Request
After job completion, an automated message invites the customer to leave a review on your preferred platform.

## Delivery Channels

Each automated message can be sent via:

- **Email** -- Professional HTML emails with your branding.
- **SMS** -- Short text messages for time-sensitive notifications like appointment reminders and on-my-way alerts.
- **Both** -- Send via both channels for maximum visibility.

## Enabling and Disabling

Each message type can be individually enabled or disabled in **Settings > Communications**. You have full control over what your customers receive.

### Tips

- At minimum, enable appointment reminders and invoice notifications -- these have the highest impact.
- Use SMS for time-sensitive messages (reminders, on-my-way) and email for detailed content (quotes, invoices).
- Review your automated messages periodically to ensure the tone matches your brand voice.`,
  },
  {
    slug: "configuring-automation-rules",
    category: "communications",
    title: "Configuring Automation Rules",
    excerpt: "Set up message templates, merge fields, and timing for automated communications.",
    lastUpdated: "2026-02-01",
    readingTime: 3,
    keywords: ["templates", "merge fields", "timing", "configuration", "rules"],
    content: `## Accessing Automation Settings

1. Go to **Settings** in the left sidebar.
2. Click the **Communications** tab.
3. You will see a list of all automation rules with their current status (enabled/disabled).

## Editing a Template

Click any automation rule to customize it. Each rule has:

### Message Template
The content of the email or SMS. You can edit the text to match your brand voice and communication style. Templates support rich formatting for emails (headings, bold, links) and plain text for SMS.

### Merge Fields
Merge fields are placeholders that automatically fill in with real data when the message is sent. Common merge fields include:

- \`{{customer_first_name}}\` -- The customer's first name.
- \`{{customer_last_name}}\` -- The customer's last name.
- \`{{job_title}}\` -- The title of the related job.
- \`{{scheduled_date}}\` -- The appointment date.
- \`{{scheduled_time}}\` -- The appointment time.
- \`{{team_member_name}}\` -- The assigned technician's name.
- \`{{invoice_total}}\` -- The invoice amount.
- \`{{quote_total}}\` -- The quote total.
- \`{{business_name}}\` -- Your business name.
- \`{{portal_link}}\` -- A link to the client portal.

Click the **Insert Merge Field** button while editing a template to see all available fields.

### Timing
For messages that are triggered before or after an event, set the timing:

- **Appointment reminders**: 24 hours before, 2 hours before, or a custom interval.
- **Payment reminders**: 3 days after due date, 7 days after, 14 days after, or custom.
- **Review requests**: 1 hour after completion, 1 day after, or custom.

### Delivery Channel
Choose whether to send via Email, SMS, or Both.

## Testing Your Templates

Before enabling an automation, click the **Send Test** button to send a test message to yourself. This lets you verify the formatting, merge fields, and overall appearance.

## Creating Custom Rules

Beyond the built-in automations, you can create custom rules for specific scenarios. Click **Add Custom Rule** and define the trigger event, conditions, timing, and message.

### Tips

- Personalize messages with the customer's first name for a friendlier tone.
- Keep SMS messages under 160 characters for reliable delivery.
- Test every template change before enabling it in production.`,
  },
  {
    slug: "on-my-way-feature",
    category: "communications",
    title: "The On My Way Feature",
    excerpt: "Notify customers automatically when a technician is heading to their location.",
    lastUpdated: "2026-02-01",
    readingTime: 2,
    keywords: ["on my way", "en route", "notification", "technician", "arrival"],
    content: `## What Is "On My Way"?

The On My Way feature lets technicians notify customers with a single tap that they are heading to the job site. It is one of the most popular features among JobStream users because it dramatically reduces "Where is my technician?" phone calls.

## How It Works

1. The technician opens their assigned job in JobStream (mobile or desktop).
2. They tap the **On My Way** button.
3. The customer immediately receives a notification.
4. The job status updates to reflect that the technician is en route.

## What the Customer Receives

The message typically includes:

- The technician's name.
- The expected arrival window (if configured).
- A friendly message like "Hi {{customer_first_name}}, {{team_member_name}} is on the way to your appointment."

You can customize this message template in **Settings > Communications**.

## Notification Channel

The On My Way notification can be sent via:

- **SMS** -- Ideal for real-time alerts. Most customers see texts within minutes.
- **Email** -- Good as a backup or for customers who prefer email.
- **Both** -- Send via both channels for maximum reach.

## Office Visibility

When a technician taps On My Way, the office team sees the update in real time on the calendar. The job block may show an "En Route" indicator, helping dispatchers track team movements.

## Best Practices

- Make On My Way part of your team's standard workflow -- tap it every time they leave for a job.
- Set the arrival window realistically so customers are not left waiting at the window.
- If a technician is running significantly late, have them call the customer directly rather than relying solely on the automated message.

### Tips

- Train new technicians on the On My Way workflow during their first week.
- Monitor the office dashboard to ensure technicians are using the feature consistently.
- Use the SMS channel for On My Way messages since timeliness matters.`,
  },
  {
    slug: "communication-history",
    category: "communications",
    title: "Communication History Log",
    excerpt: "View a complete log of all messages sent to and received from customers.",
    lastUpdated: "2026-02-01",
    readingTime: 2,
    keywords: ["history", "log", "messages", "communications", "sent", "received"],
    content: `## Accessing the Communications Log

Click **Communications** in the left sidebar to view the full message history for your business.

## What the Log Shows

The communications log displays a chronological list of all messages sent and received, including:

- **Date and time** of the message.
- **Direction** -- whether it was sent (outbound) or received (inbound).
- **Recipient or sender** -- the customer name and contact.
- **Channel** -- Email or SMS.
- **Type** -- The message category (quote notification, invoice, reminder, on-my-way, manual message, etc.).
- **Status** -- Delivered, opened, bounced, or failed.
- **Preview** -- A brief preview of the message content.

## Filtering the Log

Use the filter controls to narrow down your view:

- **Date Range** -- Focus on a specific period.
- **Channel** -- Show only emails or only SMS messages.
- **Type** -- Filter by message type (automated vs. manual, specific trigger types).
- **Customer** -- Search for messages to or from a specific customer.
- **Status** -- Filter by delivery status to find failed or bounced messages.

## Customer-Level History

You can also view communication history for a specific customer from their profile page. Click into a customer, then go to the **Communications** tab to see all messages exchanged with that person.

## Troubleshooting Delivery Issues

If a message shows a "Failed" or "Bounced" status:

- **Email bounced** -- The email address may be invalid. Contact the customer to verify.
- **SMS failed** -- The phone number may be incorrect or the number cannot receive text messages. Verify the number is a mobile phone.
- **Delivery delayed** -- Some messages may show as pending during high-volume periods. They are usually delivered within a few minutes.

### Tips

- Check the communications log when a customer says they did not receive a message -- you can confirm whether it was sent and its delivery status.
- Use filters to audit your automated messages and ensure everything is working as expected.
- Review bounced messages weekly to clean up invalid contact information.`,
  },
  {
    slug: "two-way-sms",
    category: "communications",
    title: "Two-Way SMS Messaging",
    excerpt: "Receive customer replies to your text messages and manage conversations.",
    lastUpdated: "2026-02-01",
    readingTime: 2,
    keywords: ["two-way", "sms", "replies", "inbound", "text messages", "conversation"],
    content: `## What Is Two-Way SMS?

Two-way SMS means that when your customer receives a text message from JobStream and replies to it, their response comes back into JobStream rather than disappearing into a carrier void. This enables real conversations via text.

## How It Works

1. JobStream sends an SMS to a customer (automated or manual).
2. The customer replies by texting back to the same number.
3. The reply appears in the JobStream Communications section.
4. You receive a notification that a customer responded.

## Viewing Inbound Messages

Inbound messages appear in the Communications log with an "Inbound" indicator. They show:

- The customer's name (matched by phone number).
- The message content.
- The timestamp.
- The context (which outbound message they replied to, if identifiable).

## Responding to Customer Messages

You can reply to inbound messages directly from JobStream:

1. Click on the inbound message in the Communications log.
2. Type your response in the reply field.
3. Click **Send**.

The customer receives your reply as a text message from the same number.

## Common Customer Responses

Customers often reply to automated messages with questions or confirmations:

- **Appointment confirmations** -- "Yes, I'll be home at 2pm."
- **Rescheduling requests** -- "Can we move this to Thursday?"
- **Questions** -- "How long will the job take?"
- **Gate codes or access info** -- "The code is 1234."

## Managing the Conversation

The Communications section shows conversations threaded by customer, so you can see the full back-and-forth context.

### Tips

- Check for inbound SMS messages multiple times per day so customers get timely responses.
- Keep your replies concise and professional since customers see your business number.
- Use inbound SMS as a signal to call the customer if the conversation becomes complex.`,
  },
  // ============================================
  // REVIEWS
  // ============================================
  {
    slug: "setting-up-review-links",
    category: "reviews",
    title: "Setting Up Review Links",
    excerpt: "Configure your Google, Yelp, and Facebook review page URLs.",
    lastUpdated: "2026-02-01",
    readingTime: 2,
    keywords: ["review links", "google", "yelp", "facebook", "setup"],
    content: `## Why Review Links Matter

When JobStream sends automated review requests to your customers, those messages include a direct link to your review page. Setting up these links correctly ensures customers land on the right page with minimal friction.

## Adding Your Review Links

1. Go to **Settings** in the left sidebar.
2. Click the **Reviews** tab.
3. Enter the URLs for each platform you want to collect reviews on.

### Google Business Profile
1. Search for your business on Google Maps.
2. Click your business listing.
3. Click **Write a Review** and copy the URL from your browser's address bar.
4. Paste this URL into the Google Review Link field in JobStream.

### Yelp
1. Go to your Yelp business page.
2. Copy the URL from your browser's address bar.
3. Paste it into the Yelp Review Link field.

### Facebook
1. Go to your Facebook business page.
2. Click the **Reviews** tab.
3. Copy the URL.
4. Paste it into the Facebook Review Link field.

## Choosing a Primary Platform

If you have multiple review links configured, select one as your **primary platform**. This is the platform featured most prominently in review request messages. We recommend Google as your primary since Google reviews have the highest impact on local search visibility.

## Testing Your Links

After entering your links, click each **Test Link** button to verify they open the correct review page. Broken or incorrect links lead to customer frustration and lost reviews.

### Tips

- Focus on one or two platforms rather than spreading reviews too thin across many sites.
- Google reviews are generally the most valuable for local service businesses.
- Update your links if you change your business name or if the platform updates their URL structure.`,
  },
  {
    slug: "automated-review-requests",
    category: "reviews",
    title: "Automated Review Requests",
    excerpt: "Automatically ask customers for reviews after job completion.",
    lastUpdated: "2026-02-01",
    readingTime: 2,
    keywords: ["automated", "review request", "post-job", "automation"],
    content: `## How Automated Review Requests Work

JobStream can automatically send a review request to customers after you complete a job. This consistent outreach leads to a steady stream of new reviews without any manual effort from your team.

## Setting Up the Automation

1. Go to **Settings > Communications**.
2. Find the **Review Request** automation rule.
3. Toggle it to **Enabled**.
4. Configure the settings:

### Timing
Choose when the review request is sent after job completion:
- **1 hour after** -- While the experience is fresh. Best for short service calls.
- **1 day after** -- Gives the customer time to evaluate the work. Best for larger projects.
- **Custom** -- Set any interval that works for your business.

### Channel
- **Email** -- Includes your branding, a personal message, and a prominent button linking to your review page.
- **SMS** -- A short, direct text message with a review link. Higher open rates than email.
- **Both** -- Send via both channels. The email provides detail while the SMS ensures visibility.

### Template
Customize the message content. A good review request is:
- Personal -- Use the customer's name and reference the completed job.
- Brief -- Get to the point quickly.
- Grateful -- Thank them for their business before asking for the review.
- Simple -- One clear call to action (the review link).

## Filtering Who Receives Requests

You can optionally set conditions for when review requests are sent:
- **Minimum job value** -- Only request reviews for jobs above a certain amount.
- **Customer tags** -- Exclude certain customer segments.
- **Job completion status** -- Only send if the job was marked complete (not cancelled).

### Tips

- The best time to ask for a review is within 24 hours of job completion.
- SMS review requests typically get higher response rates than email alone.
- Monitor your review rate (reviews received vs. requests sent) and adjust timing or messaging if it is low.`,
  },
  {
    slug: "managing-reviews",
    category: "reviews",
    title: "Managing Reviews",
    excerpt: "Track, respond to, and measure your online reviews from within JobStream.",
    lastUpdated: "2026-02-01",
    readingTime: 2,
    keywords: ["manage reviews", "respond", "metrics", "track", "reputation"],
    content: `## The Reviews Dashboard

Click **Reviews** in the left sidebar to access your reviews management dashboard.

## Overview Metrics

At the top of the page, you will see key metrics:

- **Total Reviews** -- The number of reviews across all platforms.
- **Average Rating** -- Your overall star rating.
- **Review Requests Sent** -- How many requests were sent in the current period.
- **Response Rate** -- The percentage of requests that resulted in a review.

## Adding Reviews Manually

While automated tracking captures reviews from some sources, you can also add reviews manually:

1. Click **Add Review**.
2. Select the platform (Google, Yelp, Facebook, or Other).
3. Enter the reviewer's name, rating, review text, and date.
4. Click **Save**.

This is useful for tracking reviews that come in through platforms JobStream does not automatically monitor.

## Responding to Reviews

Responding to reviews -- both positive and negative -- shows customers that you value their feedback. While JobStream does not post responses directly to review platforms, it helps you track your response activity:

1. Click on any review.
2. Click **Mark as Responded**.
3. Optionally add a note about your response for internal records.

We recommend responding to all reviews within 24-48 hours directly on the respective platform.

## Handling Negative Reviews

When you receive a negative review:

1. Do not react emotionally. Take time to consider the feedback.
2. Respond professionally and empathetically on the platform.
3. Offer to resolve the issue offline by inviting the customer to contact you directly.
4. Document the situation in JobStream with internal notes.
5. Follow up to ensure the issue is resolved.

### Tips

- Aim to maintain a response rate above 90% for review requests.
- Respond to every review, positive or negative, to show you are engaged.
- Use review feedback to identify areas for service improvement.`,
  },
  // ============================================
  // REPORTS & ANALYTICS
  // ============================================
  {
    slug: "dashboard-overview",
    category: "reports-analytics",
    title: "Dashboard Overview",
    excerpt: "Understand the summary cards and charts on your main dashboard.",
    lastUpdated: "2026-02-01",
    readingTime: 3,
    keywords: ["dashboard", "overview", "summary", "cards", "charts", "metrics"],
    content: `## The Main Dashboard

When you log into JobStream, the Dashboard is your home base. It provides a quick snapshot of your business health with summary cards and visual charts.

## Summary Cards

The top of the dashboard displays key performance indicators:

### Today's Jobs
Shows the number of jobs scheduled for today, broken down by status (scheduled, in progress, completed). Click this card to jump to today's calendar view.

### Outstanding Invoices
The total dollar amount of unpaid invoices. This includes both current and overdue amounts. Click to jump to the Invoices page filtered to outstanding.

### Revenue This Month
Your total collected revenue for the current month. This updates in real time as payments are received.

### Jobs Completed This Week
The number of jobs marked as completed in the current week. Helps you gauge team productivity.

## Charts and Graphs

Below the summary cards, the dashboard includes visual analytics:

### Revenue Chart
A line or bar chart showing revenue over time (daily, weekly, or monthly). Use the time range selector to zoom into specific periods.

### Job Status Breakdown
A pie or donut chart showing the distribution of job statuses (scheduled, in progress, completed, cancelled). Helps you understand your pipeline at a glance.

### Team Performance
A comparison of job completions by team member for the current period. Identifies your top performers and anyone who might need support.

### Recent Activity
A timeline of recent actions across your account: new customers added, quotes sent, jobs completed, payments received. This keeps you aware of what is happening in your business in real time.

## Customizing the Dashboard

The dashboard layout is designed for the most common metrics. The time period for each section can be adjusted using the date controls at the top of the page.

### Tips

- Start each work day by reviewing the dashboard for 60 seconds to understand the state of your business.
- Pay attention to the Outstanding Invoices card -- a rising number means your collection process may need attention.
- Use the team performance chart during weekly meetings to recognize high performers.`,
  },
  {
    slug: "revenue-reports",
    category: "reports-analytics",
    title: "Revenue Reports",
    excerpt: "Deep dive into your revenue data with filtering and export options.",
    lastUpdated: "2026-02-01",
    readingTime: 2,
    keywords: ["revenue", "reports", "financial", "income", "export", "analytics"],
    content: `## Accessing Revenue Reports

1. Click **Reports** in the left sidebar.
2. Select the **Revenue** tab.

## Report Contents

The revenue report provides detailed financial data including:

### Summary Metrics
- **Total Revenue** -- All payments received in the selected period.
- **Average Job Value** -- Total revenue divided by completed jobs.
- **Largest Job** -- The highest-value job completed.
- **Payment Breakdown** -- Revenue split by payment method (online, cash, check).

### Revenue Over Time
A chart showing revenue trends over the selected period. You can view this daily, weekly, or monthly to identify patterns and growth trends.

### Revenue by Service
A breakdown of revenue by service type. See which services generate the most income for your business.

### Revenue by Customer
Identifies your highest-value customers by total spend. Useful for understanding customer lifetime value.

## Filtering

Narrow your report with these filters:

- **Date Range** -- Custom start and end dates, or preset ranges (This Month, Last Month, This Quarter, This Year).
- **Team Member** -- See revenue attributed to specific team members.
- **Service Type** -- Focus on a particular service category.
- **Payment Method** -- Filter by how payments were received.
- **Customer** -- View revenue from a specific customer.

## Exporting

Click **Export** to download the report data as a CSV file. The export includes all data points visible in the current filtered view. This is useful for importing into accounting software, creating custom analyses in spreadsheets, or sharing with stakeholders.

### Tips

- Compare the same month year-over-year to measure business growth.
- Use the "Revenue by Service" view to decide which services to promote or expand.
- Export monthly reports for your accountant or bookkeeper.`,
  },
  {
    slug: "jobs-quotes-team-reports",
    category: "reports-analytics",
    title: "Jobs, Quotes, and Team Reports",
    excerpt: "Explore the other report tabs for operational and team performance insights.",
    lastUpdated: "2026-02-01",
    readingTime: 3,
    keywords: ["jobs report", "quotes report", "team report", "performance", "analytics"],
    content: `## Jobs Report

Access this from **Reports > Jobs**. It provides insights into your job pipeline and completion metrics:

### Key Metrics
- **Total Jobs Created** -- How many jobs were created in the period.
- **Jobs Completed** -- The number of completed jobs.
- **Completion Rate** -- Percentage of created jobs that were completed.
- **Average Job Duration** -- The typical time from creation to completion.
- **Cancellation Rate** -- Percentage of jobs that were cancelled.

### Jobs by Status
A breakdown showing how many jobs are in each status (draft, scheduled, in progress, on hold, completed, cancelled). Identifies bottlenecks in your workflow.

### Jobs by Service Type
See which services are most in demand. This helps with staffing, inventory, and marketing decisions.

## Quotes Report

Access this from **Reports > Quotes**. Track your quoting effectiveness:

### Key Metrics
- **Quotes Sent** -- Total number of quotes sent to customers.
- **Quotes Approved** -- How many were accepted.
- **Approval Rate** -- The percentage of sent quotes that were approved. Industry benchmarks vary, but 40-60% is healthy for most service businesses.
- **Average Quote Value** -- The typical dollar amount of your quotes.
- **Total Quoted Value** -- The sum of all quotes sent.

### Conversion Funnel
A visual funnel showing Quotes Sent, Viewed, Approved, and Converted to Job. Identify where prospects drop off.

### Time to Approval
How long customers take to respond to quotes. If this number is high, consider following up more proactively.

## Team Report

Access this from **Reports > Team**. Evaluate team performance:

### Key Metrics per Team Member
- **Jobs Completed** -- Total jobs each team member finished.
- **Revenue Generated** -- Total revenue from their completed jobs.
- **Average Rating** -- If reviews mention specific team members.
- **Utilization Rate** -- Percentage of available hours that were scheduled.

### Comparison View
Side-by-side comparison of team members across key metrics. Useful for performance reviews and identifying training needs.

### Tips

- Review the quotes approval rate monthly. If it drops, examine your pricing or follow-up process.
- Use the team report in monthly or quarterly performance reviews.
- Track the jobs cancellation rate to identify patterns (pricing, scheduling, customer type).`,
  },
  // ============================================
  // ACCOUNT & SETTINGS
  // ============================================
  {
    slug: "editing-your-profile",
    category: "account-settings",
    title: "Editing Your Profile",
    excerpt: "Update your name, email, password, and avatar in your personal profile.",
    lastUpdated: "2026-02-01",
    readingTime: 2,
    keywords: ["profile", "name", "email", "password", "avatar", "personal"],
    content: `## Accessing Your Profile

1. Click your name or avatar in the bottom left of the sidebar.
2. Select **Profile** from the menu.
3. Your personal profile page opens.

## Updating Your Information

### Name
Edit your **first name** and **last name**. These appear on job assignments, internal communications, and customer-facing messages you send manually.

### Email
Update your login email address. After changing your email, you may need to verify the new address by clicking a confirmation link. Your email is also used for receiving notifications from JobStream.

### Phone Number
Add or update your direct phone number. This can be used for two-factor authentication and is not shared with customers.

### Avatar
Upload a profile photo. Your avatar appears in the sidebar, in team views, and on the calendar next to your assigned jobs. Recommended size is 200x200 pixels.

To upload or change your avatar:
1. Click the current avatar (or the placeholder icon).
2. Select an image from your device.
3. Crop if needed.
4. Click **Save**.

## Changing Your Password

1. On the profile page, click **Change Password**.
2. Enter your current password for verification.
3. Enter your new password.
4. Confirm the new password by typing it again.
5. Click **Update Password**.

Password requirements:
- Minimum 8 characters.
- Must include at least one uppercase letter, one lowercase letter, and one number.

## Notification Preferences

On your profile page, you can also manage which notifications you receive:

- **Email notifications** -- Toggle on/off for different event types (new booking, payment received, etc.).
- **In-app notifications** -- Choose which events show as badges in the sidebar.

### Tips

- Use a recognizable photo as your avatar so team members can quickly identify you in calendar views.
- Choose a strong, unique password and change it periodically.
- Configure notifications to match your role -- admins may want all notifications, while technicians may only need job assignments.`,
  },
  {
    slug: "business-settings",
    category: "account-settings",
    title: "Business Settings",
    excerpt: "Configure your business info, logo, tax rates, and operating hours.",
    lastUpdated: "2026-02-01",
    readingTime: 3,
    keywords: ["business settings", "company", "logo", "tax", "hours", "configuration"],
    content: `## Accessing Business Settings

1. Click **Settings** in the left sidebar.
2. Select the **General** tab.

## Business Information

### Company Details
- **Business Name** -- Your registered or trade name. Appears on all customer-facing documents.
- **Phone Number** -- Your main business line.
- **Email Address** -- The primary contact email for your business.
- **Website** -- Your business website URL.
- **Address** -- Your physical business address. Appears on invoices and quotes.

### Logo
Upload your company logo for use on quotes, invoices, the client portal, and email communications.

Requirements:
- Format: PNG, JPG, or SVG.
- Recommended size: 400x400 pixels.
- Maximum file size: 2MB.

Click the logo area to upload. The logo previews immediately so you can verify it looks correct.

## Tax Settings

### Default Tax Rate
Set the standard tax rate that auto-applies to taxable line items on quotes and invoices. Enter the percentage (e.g., 8.25 for 8.25% sales tax).

### Tax Number
Enter your business tax identification number (EIN, GST number, etc.). This appears on invoices for your customers' records.

### Tax-Inclusive Pricing
Toggle whether your line item prices include tax or if tax is added on top. Choose based on your local regulations and customer expectations.

## Business Hours

Define your standard operating hours for each day of the week. These hours are used for:

- The online booking widget (customers can only book during business hours).
- The client portal display.
- Scheduling suggestions and capacity planning.

For each day, set the open time, close time, or mark the day as closed.

## Invoice Settings

- **Invoice Number Prefix** -- Customize the prefix for invoice numbers (e.g., "INV-" or "JS-").
- **Default Payment Terms** -- Set the default due date offset (Net 15, Net 30, Net 60, Due on Receipt).
- **Late Fee Policy** -- Configure automatic late fees if applicable.

### Tips

- Review your tax settings with your accountant to ensure compliance with local regulations.
- Update business hours seasonally if your schedule changes (extended summer hours, holiday closures).
- Use a professional, high-contrast logo that is readable at small sizes.`,
  },
  {
    slug: "managing-your-team",
    category: "account-settings",
    title: "Managing Your Team",
    excerpt: "Add, remove, and manage team member accounts and their settings.",
    lastUpdated: "2026-02-01",
    readingTime: 2,
    keywords: ["team", "manage", "add", "remove", "deactivate", "members"],
    content: `## Team Management Page

1. Go to **Settings** in the left sidebar.
2. Click the **Team** tab.
3. You will see a list of all team members with their roles and statuses.

## Adding a Team Member

1. Click **Invite Member**.
2. Enter their first name, last name, and email address.
3. Select a role (Admin, Manager, or Technician).
4. Click **Send Invite**.

The new member receives an email with instructions to set up their password and log in.

## Editing a Team Member

Click any team member to view and edit their details:

- **Name** -- Update their first or last name.
- **Email** -- Change their login email.
- **Role** -- Adjust their permission level.
- **Calendar Color** -- Choose their color for the schedule view.
- **Phone** -- Add or update their direct number.

## Deactivating a Team Member

When someone leaves your company, deactivate their account rather than deleting it:

1. Click the team member.
2. Click **Deactivate Account**.
3. Confirm the action.

Deactivated members:
- Cannot log in.
- Are removed from scheduling options.
- Their historical data (completed jobs, notes, etc.) is preserved.
- Can be reactivated if they return.

## Reactivating a Member

If a team member returns, click **Reactivate** on their profile to restore their access.

## Resending Invitations

If a team member did not receive or lost their invitation email:

1. Find them in the team list (they will show "Pending" status).
2. Click **Resend Invite**.

### Tips

- Always deactivate rather than delete departing employees to preserve their work history.
- Review team roles quarterly to ensure they match current responsibilities.
- Keep calendar colors distinct for easy visual scheduling.`,
  },
  {
    slug: "roles-and-permissions",
    category: "account-settings",
    title: "Understanding Roles and Permissions",
    excerpt: "Detailed breakdown of what each role can access and do in JobStream.",
    lastUpdated: "2026-02-01",
    readingTime: 3,
    keywords: ["roles", "permissions", "admin", "manager", "technician", "access"],
    content: `## Role Overview

JobStream uses a role-based access control system with three built-in roles. Each role has a specific set of permissions designed for different responsibilities within your business.

## Admin Role

Admins have unrestricted access to every feature in JobStream. This role is intended for business owners and senior office staff.

### Admin Permissions
- Full customer management (create, edit, delete, archive).
- Create, send, and manage quotes.
- Create, assign, and manage all jobs.
- Create, send, and manage invoices.
- Record and manage payments.
- View and export all reports (revenue, jobs, team performance).
- Access all settings (business info, team, services, integrations, communications).
- Invite and manage team members, including changing roles.
- Connect and manage Stripe integration.
- Configure automated messages and booking widget.

## Manager Role

Managers have broad operational access but cannot modify account-level settings or manage team roles. This role is for office coordinators and crew leads.

### Manager Permissions
- Full customer management.
- Create, send, and manage quotes.
- Create, assign, and manage all jobs (including other team members' jobs).
- Create, send, and manage invoices.
- Record payments.
- View reports (but not export or modify report settings).
- View team schedules.
- Cannot change business settings.
- Cannot manage team members or roles.
- Cannot connect or disconnect integrations.

## Technician Role

Technicians have a focused view designed for fieldwork. They see only what they need to do their jobs efficiently.

### Technician Permissions
- View their own assigned jobs.
- Update job status (in progress, on hold, complete).
- Add notes, photos, and checklist updates to their jobs.
- Use the "On My Way" feature.
- View customer contact info and property details for their assigned jobs.
- View their own schedule on the calendar.
- Cannot create quotes, invoices, or new jobs.
- Cannot view financial data or reports.
- Cannot access settings.
- Cannot see other team members' schedules.

## Choosing the Right Role

| Responsibility | Recommended Role |
|---|---|
| Business owner | Admin |
| Office manager | Admin |
| Dispatcher / coordinator | Manager |
| Crew lead | Manager |
| Field technician | Technician |
| Part-time helper | Technician |

## Changing a Team Member's Role

Admins can change any team member's role:

1. Go to **Settings > Team**.
2. Click the team member.
3. Select the new role from the dropdown.
4. Click **Save**.

The change takes effect immediately. The team member may need to refresh their browser to see the updated navigation.

### Tips

- Start with the most restrictive role that fits the person's job duties and escalate if needed.
- When in doubt, Manager is a good middle ground for trusted office staff.
- Periodically audit roles to ensure they still match each person's actual responsibilities.`,
  },
]

export function getArticlesByCategory(categorySlug: string): HelpArticle[] {
  return helpArticles.filter((a) => a.category === categorySlug)
}

export function getArticleBySlug(categorySlug: string, articleSlug: string): HelpArticle | undefined {
  return helpArticles.find((a) => a.category === categorySlug && a.slug === articleSlug)
}

export function getAllArticles(): HelpArticle[] {
  return helpArticles
}

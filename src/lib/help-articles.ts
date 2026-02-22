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

1. **Dashboard** -- Your home base with summary cards showing revenue, jobs completed, outstanding invoices, and quote conversion.
2. **Customers** -- Your complete customer database.
3. **Quotes** -- All quotes organized by status.
4. **Schedule** -- The calendar view where you manage appointments and assignments.
5. **Jobs** -- Active and completed jobs.
6. **Invoices** -- All invoices and their payment statuses.
7. **Payments** -- Payment history and financial overview.
8. **Time Tracking** -- Track time spent on jobs by team members.
9. **Bookings** -- Online booking requests from customers.
10. **Reviews** -- Review requests and responses.
11. **Reports** -- Business performance analytics.
12. **Communications** -- Message logs and automation settings.
13. **Settings** -- Account configuration, team management, and integrations.

Your personal profile is accessed from the top bar by clicking your name or avatar in the top-right corner, not from the sidebar.

## Next Steps

We recommend starting with these setup tasks in order: configure your business information, invite your team, add your services, and connect Stripe for payments. Each of these steps has its own detailed guide in this Help Center.`,
  },
  {
    slug: "setting-up-your-business",
    category: "getting-started",
    title: "Setting Up Your Business Profile",
    excerpt: "Configure your business name, address, and other essential information.",
    lastUpdated: "2026-02-01",
    readingTime: 3,
    keywords: ["business profile", "settings", "setup", "company info"],
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

- **Website** -- Your business website URL.
- **Default Tax Rate** -- Set your standard tax rate so it auto-applies to new line items on quotes and invoices.
- **Business Hours** -- Define your standard operating hours for each day of the week. Each day has a Switch toggle to enable or disable it, along with a Start Time and End Time. These hours are displayed on your online booking widget and client portal.

## Document Prefixes

In General settings, you can also configure three document prefixes:

- **Invoice Prefix** -- Customize the prefix for invoice numbers (e.g., "INV-").
- **Quote Prefix** -- Customize the prefix for quote numbers (e.g., "QT-").
- **Job Prefix** -- Customize the prefix for job numbers (e.g., "JOB-").

## Invoice and Quote Defaults

- **Default Invoice Due (days)** -- A number input that sets how many days after the invoice date payment is due.
- **Default Quote Validity (days)** -- A number input that sets how many days a quote remains valid before expiring.

## Saving Your Changes

After filling in your information, click the **Save Changes** button at the bottom of the form. Your updates take effect immediately and will appear on any new documents you create.

### Tips

- Keep your business name consistent across all platforms for brand recognition.
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
3. Click the **Invite Team Member** button in the top right.
4. Fill in their **first name**, **last name**, and **email address**.
5. Select a **role** from the dropdown (see roles below).
6. Click **Send Invite**.

The team member will receive an email with a link to create their password and access the account.

## Understanding Roles

JobStream has three built-in roles that control what each team member can see and do:

### Owner
Owners have full, unrestricted access to everything in JobStream, including billing, account-level settings, and the ability to manage all team members. This is the role assigned to the person who created the account.

### Admin
Admins have full access to nearly everything in JobStream. They can manage team members, view reports, change settings, and perform any action. Assign this role to office managers and senior staff.

### Technician
Technicians have a focused view designed for fieldwork. They can see their own assigned jobs, update job statuses, add notes and photos, and mark jobs as complete. They cannot create quotes or invoices, view financial reports, or access settings.

## Managing Existing Members

On the Team settings page, you can see all current members with their roles and statuses. For each team member, you can use the dropdown action menu to:

- **Change their role** -- Select "Change to Admin" or "Change to Technician" to adjust permissions as needed.
- **Deactivate their account** -- If someone leaves your company, click **Deactivate** to preserve their job history while removing their access.

There is no click-to-edit detail view for team members. Role changes and deactivation are handled through the dropdown action menu on the team list.

## Best Practices

- Start by inviting your office staff as Admins so they can help with data entry.
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
    lastUpdated: "2026-02-22",
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

Once connected, the Payments settings page shows your Stripe account status as "Connected" with a green badge and your masked account ID. You also see:

- **Online Payments toggle** -- A switch to enable or disable online payments. When enabled, invoices in the client portal display a **Pay Now** button that redirects customers to Stripe Checkout.
- **Payment status updates automatically** -- When a customer completes payment through Stripe Checkout, a webhook notifies JobStream and the invoice status changes to "Paid" automatically.
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
2. Click the **Add Customer** button in the top right corner.
3. A side sheet opens with the heading "Add Customer." Fill in the customer details form.

## Required Fields

- **First Name** and **Last Name** -- The customer's full name. For commercial clients, you can enter the business contact person's name.

## Optional Fields

- **Email** -- The customer's email address. Needed if you plan to send quotes and invoices electronically.
- **Phone** -- The customer's phone number. Mobile phone is preferred since it enables SMS notifications.
- **Company** -- If this is a commercial or business customer, enter their company name here. It will appear on quotes and invoices alongside the contact name.
- **Notes** -- Add any internal notes about the customer such as gate codes, pet information, or scheduling preferences. These notes are visible only to your team.
- **Source** -- A dropdown to indicate how you found this customer. Options include: referral, google, website, social, and other.
- **Tags** -- Apply tags like "VIP," "Residential," or "Commercial" to organize and filter your customer list. You can add multiple tags using a comma-separated input.

## Properties

You can add service addresses (properties) for the customer with the following fields:
- **Street** -- The street address of the service location.
- **City** -- The city.
- **State** -- The state or province.
- **ZIP** -- The postal or ZIP code.
- **Label** -- An optional label to identify the property (e.g., "Main House," "Office").

## Saving

Click **Save Customer** to create the record.

## Quick Create

If you are in the middle of creating a quote or job, you can add a new customer on the fly without leaving the form. The customer selector is a combobox (cmdk-based search), so start typing and select from the results or add a new customer.

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

Start by choosing who the quote is for. The customer field is a combobox (cmdk-based search). Start typing the customer's name and select them from the results. If the customer is new, you can add them separately from the Customers page first.

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

You have two separate buttons at the bottom of the quote form:

- **Send Quote** (primary button) -- Saves the quote and immediately sends it to the customer via email.
- **Save as Draft** (secondary button) -- Saves the quote without sending it. Use this when you are still working on the details.

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
    keywords: ["send quote", "email", "delivery", "tracking"],
    content: `## Delivery Methods

JobStream delivers quotes to your customers via email.

### Email Delivery

When you click **Send Quote**, JobStream sends a professional email to the customer with:

- A summary of the quote including the total amount.
- A **View Quote** button that opens the full quote in the client portal.
- Your business name and contact information.

## Tracking Quote Status

After sending, JobStream tracks the quote through these statuses:

- **Sent** -- The email has been sent to the customer.
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

- Follow up within 48 hours of sending if the customer has not responded to the quote.
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
    keywords: ["expiration", "expired", "validity", "extend"],
    content: `## How Expiration Works

Every quote in JobStream has an expiration date. After this date passes, the quote status automatically changes to **Expired** and the customer can no longer approve it through the client portal.

## Setting the Expiration Date

When creating a quote, the expiration date defaults to 30 days from the creation date. You can change this on a per-quote basis by editing the **Valid Until** field. Some businesses prefer shorter windows (7-14 days) to encourage faster decisions.

## Changing the Default Expiration Period

To change the default validity period for all new quotes:

1. Go to **Settings** in the left sidebar.
2. Click the **General** tab.
3. Adjust the **Default Quote Validity (days)** field to your preferred number of days.
4. Click **Save Changes**.

## What Happens When a Quote Expires

- The quote status changes to **Expired** in your quotes list.
- The customer sees a message that the quote is no longer valid if they try to access it in the portal.
- The quote's line items and pricing are preserved for your records.

## Handling an Expired Quote

If a customer comes back after expiration and wants to move forward, you will need to create a new quote. Expired quotes cannot be reopened. Use the expired quote as a reference for the line items and pricing, adjusting any rates that have changed.

## Bulk Actions

On the Quotes list page, you can filter by "Expired" status to review all expired quotes at once. This is a good practice to do weekly so you can follow up with prospects or archive quotes that are no longer relevant.

### Tips

- Shorter expiration windows (7-14 days) create urgency and lead to faster decisions.
- Always update pricing when creating new quotes from expired ones to avoid honoring outdated rates.
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
    lastUpdated: "2026-02-22",
    readingTime: 2,
    keywords: ["create job", "calendar", "quick create", "schedule", "new job", "add job"],
    content: `## Creating from the Calendar

The fastest way to schedule a new job is to start from the calendar. There are two convenient methods.

## Method 1: Add Job Button

The calendar toolbar prominently displays an **Add Job** button. Clicking it navigates you to the job creation form at \`/jobs/new\` with the current calendar date pre-filled in the date field. This is the quickest way to create a new job while looking at your schedule.

## Method 2: Click a Time Slot

1. Navigate to the **Schedule** page.
2. Switch to **Week** or **Day** view for the most precise time selection.
3. Click on the desired time slot in the calendar.
4. You are taken to the full job creation form with the selected date pre-populated.
5. Fill in all job details: customer, title, line items, assignment, notes, etc.
6. Click **Create Job** to save.

## After Creation

The new job immediately appears on the calendar in the correct time slot. It is color-coded by status (blue for scheduled) and displays the customer name and job title.

### Tips

- Use the **Add Job** button in the toolbar for the fastest experience -- it pre-fills the currently displayed date.
- Click a specific time slot when you need to pre-fill a precise time as well.
- Use the full form to add detailed line items, notes, and checklists.`,
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
- **Start Date** (required) -- When the job should be performed. This field is required.
- **Start Time** -- The appointment start time.
- **End Time / Duration** -- Either set an end time or a duration.

### Priority
Set the job priority level: **Low**, **Medium**, **High**, or **Urgent**. Priority helps your team understand which jobs need immediate attention.

### Assignment
Select one or more team members to perform the job. The job appears on their individual calendars.

### Notes
Add internal notes for your team. These are not visible to the customer and are perfect for instructions like "Enter through the side gate" or "Customer prefers morning appointments."

### Checklist
Add a checklist of items to complete during the job. Technicians can check these off as they work, ensuring nothing is missed.

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

### 1. Scheduled
The job has a confirmed date, time, and team member assignment. It appears on the calendar and the assigned team member can see it in their schedule. This is the starting status for new jobs.

### 2. In Progress
A team member has started working on the job. This status indicates active on-site work. The transition to In Progress happens by manually changing the status from the job detail page.

### 3. Completed
The work is finished. Completing a job triggers the option to create an invoice and can also trigger automated actions like review requests.

### 4. Cancelled
The job has been cancelled and will not be performed. Cancelled jobs are removed from the active calendar view but remain in your records for reference.

## Changing a Job's Status

You can change a job's status in several ways:

- **From the job detail page** -- Click the status badge and select the new status.
- **From the calendar** -- Right-click a job and choose the new status.
- **From the jobs list** -- Use the quick actions menu on any job row.

## Automated Transitions

When all checklist items are completed, you may see a prompt to mark the job as complete.

### Tips

- Keep job statuses current so your team and reports always reflect reality.
- Review cancelled jobs monthly to spot patterns (pricing issues, scheduling problems).`,
  },
  {
    slug: "working-on-a-job",
    category: "job-management",
    title: "Working on a Job",
    excerpt: "Use checklists, notes, file attachments, and time tracking during active jobs.",
    lastUpdated: "2026-02-22",
    readingTime: 4,
    keywords: ["checklist", "notes", "photos", "field", "technician", "file upload", "attachments", "drag and drop"],
    content: `## In the Field

Once a job is in progress, your field technicians can use JobStream to track their work, communicate with the office, and document the job. The job detail page organizes this information into tabs: **Checklist**, **Notes**, **Attachments**, and **Time**.

## Checklists

If the job has a checklist, technicians see it on the job detail page under the Checklist tab. Each item has a checkbox that can be toggled to mark it as completed or not completed. The checklist persists on the server, so progress is saved immediately.

### Adding Checklist Items

Checklist items can be added in two ways:

1. **During job creation** -- When building a new job, add checklist items in the Checklist section of the job form. Type a label and click the **+** button or press Enter to add each item.
2. **On the job detail page** -- While working on a job, you can add new items directly from the Checklist tab if additional tasks are discovered on-site.

### Toggling Completion

Click any checklist item to toggle it between completed and not completed. Completed items show a checkmark. The completion state is saved to the server immediately via a server action.

## Job Notes

Notes serve two purposes:

- **Internal Notes** -- Visible only to your team. Technicians can add notes about what they found on-site, work performed, or issues encountered.
- **Customer-Facing Notes** -- These appear on the invoice or completion summary sent to the customer.

To add a note, open the job detail page, go to the Notes tab, type your note, and click **Add Note**. Notes are timestamped and attributed to the team member who wrote them.

## File Attachments

The Attachments tab provides a drag-and-drop upload zone for attaching files to jobs. This is useful for photos, documents, diagrams, permits, or any other relevant files.

### Uploading Files

1. Open the job detail page.
2. Click the **Attachments** tab.
3. Either **drag and drop** files onto the upload zone, or click **Browse Files** to select files from your device.
4. Files are uploaded to the server immediately. A success notification confirms each upload.
5. Multiple files can be uploaded at once.

### Viewing Attachments

Uploaded files appear in a grid below the upload zone. Each attachment shows:

- File name
- File size
- Upload date
- A link to download or view the file

## Time Tracking

The Time tab on the job detail page integrates with JobStream's time tracking feature. See the Time Tracking section of the Help Center for details on starting, stopping, and managing timers.

### Tips

- Use checklists to maintain consistent service quality across your team.
- Encourage technicians to upload before and after photos on every job for quality documentation.
- Drag-and-drop makes it fast to attach multiple files from your desktop or file manager.
- Add notes as you work rather than trying to remember details later.`,
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

The completion modal is simple and focused:

### Completion Notes
A text area where you can write a summary of the work completed. Note any follow-up work recommended for future visits. These notes are saved to the job record.

Click **Complete** to finalize the job.

## Create Invoice Prompt

After completing the job, a separate prompt appears asking if you want to create an invoice:

- **Create Invoice** -- Generates an invoice from the job's line items. The invoice is created in Draft status so you can review it before sending.
- **Not Now** -- Skips invoice creation. You can always create an invoice from the job later.

## After Completion

Once completed, the job moves to the Completed status. It remains accessible in your job list and in the customer's history. The calendar slot shows the job as completed with a visual indicator.

If you created an invoice, navigate to **Invoices** to review and send it to the customer.

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
    lastUpdated: "2026-02-22",
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
- **Biweekly** -- Every two weeks on the selected day.
- **Monthly** -- On a specific date or day of the month (e.g., the first Tuesday).

### End Date Options
- **Never** -- The recurrence continues indefinitely until you manually stop it.
- **On a date** -- Specify a specific date when the recurrence should stop.

4. Click **Save** to create the recurring series.

## Generating Recurring Instances

After setting up a recurring job, click the **Generate Schedule** button on the job detail page to create the individual job instances. This button appears in the recurring section of the job details and generates the next batch of occurrences based on your recurrence pattern.

## How Recurring Jobs Appear

Each generated instance appears on the calendar as its own job that can be independently edited, reassigned, or rescheduled. The series is linked, so you can also make changes to all future occurrences at once.

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
6. Click **Send Invoice** to send immediately, or **Save as Draft** to review it first.

## Invoice Fields

- **Invoice Number** -- Auto-generated sequentially. You can customize the prefix in Settings.
- **Invoice Date** -- When the invoice was issued. Defaults to today.
- **Due Date** -- When payment is expected. Defaults to the number of days configured in your Default Invoice Due (days) setting.
- **Line Items** -- Services and materials with quantities and prices.
- **Tax** -- Applied automatically based on your settings, or adjustable per line item.
- **Discount** -- Add a percentage or fixed amount discount if applicable.
- **Customer Note (visible on invoice)** -- Notes or payment instructions that appear on the customer-facing invoice.
- **Internal Note (not visible to customer)** -- Private notes for your team that do not appear on the invoice.

## Invoice Statuses

- **Draft** -- Created but not yet sent to the customer.
- **Sent** -- Delivered to the customer via email.
- **Paid** -- Payment has been received (online or recorded manually).
- **Overdue** -- The due date has passed without payment.
- **Void** -- The invoice has been cancelled and will not be collected.

### Tips

- Always create invoices from jobs when possible to maintain a clear paper trail.
- Review line items before sending, especially if the job scope changed during execution.
- Set up your Default Invoice Due (days) in Settings > General so due dates auto-populate correctly.`,
  },
  {
    slug: "sending-invoices",
    category: "invoicing-payments",
    title: "Sending Invoices",
    excerpt: "Deliver invoices by email and track when customers view them.",
    lastUpdated: "2026-02-01",
    readingTime: 2,
    keywords: ["send invoice", "email", "delivery", "tracking"],
    content: `## Sending an Invoice

Once your invoice is ready, sending it is straightforward.

## Email Delivery

1. Open the invoice, or click **Send Invoice** during creation.
2. If the invoice is in Draft status, click the **Send** button.
3. JobStream sends a professional email to the customer containing:
   - Invoice summary with the amount due and due date.
   - A **View & Pay** button linking to the client portal.
   - Your business branding and contact information.

## Tracking

After sending, the invoice status updates as payments are received:

- **Sent** -- The email was successfully delivered.
- **Paid** -- Payment was made through the portal or recorded manually.

## Resending

If a customer reports they did not receive the invoice:

1. Open the invoice.
2. Click **Resend** from the actions menu.
3. A fresh email is sent with the same invoice link.

### Tips

- Send invoices promptly after job completion for faster payment.
- Follow up if a customer has not paid within a few days of the due date.`,
  },
  {
    slug: "recording-payments",
    category: "invoicing-payments",
    title: "Recording Manual Payments",
    excerpt: "How to record cash, check, or other offline payments in JobStream.",
    lastUpdated: "2026-02-01",
    readingTime: 2,
    keywords: ["record payment", "manual", "cash", "check"],
    content: `## When to Record Manually

Not all payments come through the online portal. When a customer pays by cash, check, or another offline method, you need to record the payment manually in JobStream so your records stay accurate.

## How to Record a Payment

1. Open the invoice that was paid.
2. Click the **Record Payment** button.
3. Fill in the payment details:
   - **Amount** -- The amount received. This defaults to the full outstanding balance but can be adjusted for partial payments.
   - **Payment Method** -- Select from Cash, Check, or Other.
   - **Payment Date** -- When the payment was received. Defaults to today.
   - **Reference** -- Optional. Enter a check number, transaction ID, or other reference.
4. Click **Record Payment**.

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
    lastUpdated: "2026-02-22",
    readingTime: 3,
    keywords: ["online payment", "stripe", "credit card", "portal", "pay online"],
    content: `## How Online Payments Work

When you have Stripe connected, customers can pay invoices directly through the JobStream client portal using their credit card, debit card, or other supported payment methods.

## The Customer Experience

1. The customer receives an invoice email with a **View & Pay** button.
2. Clicking the button opens the invoice in the client portal at \`/portal/{your-slug}/invoices/{token}\`.
3. They review the invoice details, line items, and amount due. They can also download a PDF of the invoice.
4. They click the **Pay Now** button.
5. The customer is redirected to **Stripe Checkout**, a secure, hosted payment page managed entirely by Stripe.
6. On the Stripe Checkout page, they enter their card details and complete the payment.
7. After successful payment, a webhook from Stripe notifies JobStream automatically.
8. The invoice status updates to Paid without any manual action required from you.

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
    lastUpdated: "2026-02-22",
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

When an invoice is overdue (or even just outstanding), you can send a payment-specific reminder:

1. Open the invoice.
2. Click the **Send Reminder** button in the invoice action bar.
3. JobStream sends a payment reminder email to the customer. This is a separate, purpose-built reminder message -- not a resend of the original invoice email. It is specifically worded to remind the customer about the outstanding payment and includes a link to view and pay.

The Send Reminder button is available on invoices that are in Sent or Overdue status. It does not appear on Draft, Paid, or Void invoices.

You can also set up automated payment reminders in **Settings > Communications** by creating an automation rule with the "Invoice Overdue" trigger.

## Other Follow-Up Options

- **Phone call** -- Sometimes a personal call is the most effective approach, especially for larger amounts.
- **Adjust the due date** -- If the customer requested an extension, edit the due date to reflect the new agreement.

## Voiding an Invoice

If an invoice should no longer be collected (billing error, customer dispute resolved, work not performed):

1. Open the invoice.
2. Click **Void** from the actions menu.
3. Confirm the action.

Voided invoices remain in your records for auditing purposes but no longer count toward your receivables. The status changes to **Void**.

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
    lastUpdated: "2026-02-22",
    readingTime: 2,
    keywords: ["payments", "dashboard", "summary", "filter", "export", "revenue"],
    content: `## Payments Dashboard Overview

The Payments page gives you a financial overview of all money coming into your business. Access it by clicking **Payments** in the left sidebar.

## Summary Cards

At the top of the page, you will see four summary cards displaying key financial metrics:

- **Received This Month** -- The total amount of all payments received in the current month.
- **Received Last Month** -- The total amount of all payments received in the previous month.
- **Outstanding** -- The total amount of unpaid invoices.
- **Overdue** -- The portion of outstanding invoices that are past their due date.

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

- **Search** -- Search for payments by customer name, invoice number, or reference.
- **Date From** -- Filter payments starting from a specific date.
- **Date To** -- Filter payments up to a specific date.
- **Method** -- Filter by payment method (Cash, Check, Other, or online payments).
- **Status** -- Filter by payment status.

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
    lastUpdated: "2026-02-22",
    readingTime: 4,
    keywords: ["portal", "client portal", "access", "customer portal", "self-service", "invoice portal", "quote portal", "booking form"],
    content: `## What Is the Client Portal?

The client portal is a secure, customer-facing website where your customers can view quotes, pay invoices, and download PDF documents. It provides a professional, self-service experience that reduces phone calls and speeds up approvals and payments.

## Portal Pages

The client portal consists of three main areas, each with its own URL pattern:

### Invoice Portal
URL pattern: \`/portal/{org-slug}/invoices/{token}\`

Customers can view invoice details including line items, subtotals, tax, and total amount due. If you have Stripe connected and online payments enabled, a **Pay Now** button appears that takes the customer through Stripe Checkout. Customers can also download a professional PDF of the invoice.

### Quote Portal
URL pattern: \`/portal/{org-slug}/quotes/{token}\`

Customers can view the full quote with all line items and pricing. Two prominent action buttons -- **Approve** and **Decline** -- let the customer respond. If declining, they can provide an optional reason. Customers can also download a PDF of the quote.

### Public Booking Form
URL pattern: \`/book/{org-slug}\`

Anyone can access this page to request a service booking. The form allows visitors to select a service from your catalog, pick a date, choose an available time slot based on your business hours, and submit their contact information. This is ideal for embedding on your website or sharing on social media.

## How Customers Access the Portal

Customers access the portal through links in the emails they receive from you. Every quote email and invoice email includes a link that opens the relevant document in the portal.

There is no separate login required. Each link contains a secure, unique access token that authenticates the customer automatically. This means customers do not need to remember a username or password.

## What Customers Can Do

- **View and approve or decline quotes** -- with full line item detail and PDF download.
- **View and pay invoices** -- with line item detail, PDF download, and online payment via Stripe Checkout.
- **Request new service** -- through the public booking form at your unique booking URL.

## Portal Branding

The client portal displays your business name, contact information, and logo. It uses a clean, professional design that builds trust with your customers.

### Tips

- Mention the client portal to new customers so they know what to expect when they receive emails from you.
- The portal works on all devices, so customers can approve quotes and pay invoices from their phones.
- Share your public booking URL (\`/book/{your-slug}\`) on your website, social media, and business cards to accept new booking requests.`,
  },
  {
    slug: "portal-pages-overview",
    category: "client-portal",
    title: "Portal Pages Overview",
    excerpt: "A tour of the different portal pages your customers can access.",
    lastUpdated: "2026-02-22",
    readingTime: 3,
    keywords: ["portal pages", "customer view", "portal home", "invoice portal", "quote portal"],
    content: `## How Portal Pages Work

The JobStream client portal is document-based. Rather than a single dashboard, each quote and invoice has its own dedicated portal page with a unique access token URL. Customers access these pages through links in the emails they receive.

## Invoice Portal Pages

Each invoice has a portal page at \`/portal/{your-slug}/invoices/{token}\`. When a customer opens this page, they see:

- Your business branding (name and logo).
- The invoice number, status, issue date, and due date.
- Customer information.
- A complete line item table with descriptions, quantities, prices, and totals.
- Subtotal, tax, discount, and grand total.
- Payment history (if any payments have been made).
- A **Download PDF** button to save a professional copy.
- A **Pay Now** button (if Stripe is connected and online payments are enabled) that redirects to Stripe Checkout.

## Quote Portal Pages

Each quote has a portal page at \`/portal/{your-slug}/quotes/{token}\`. Customers see:

- Your business branding (name and logo).
- The quote number, status, creation date, and expiration date.
- Customer information.
- Your customer message (if included).
- A complete line item table with descriptions, quantities, prices, and totals.
- Subtotal, tax, and grand total.
- A **Download PDF** button.
- **Approve** and **Decline** buttons (for quotes awaiting response).

## Public Booking Page

The public booking form at \`/book/{your-slug}\` lets anyone request a service. It is not tied to a specific document -- it is a standalone form for new booking requests. See the "Public Booking Form" article for full details.

## Security

Each portal page URL contains a unique access token that serves as authentication. This means:

- No login or account creation is required from customers.
- Each token grants access to only one specific document.
- Tokens are generated when quotes and invoices are created and included in notification emails.

### Tips

- Portal pages are fully responsive and work on phones, tablets, and desktops.
- If a customer loses their email, you can resend the quote or invoice to provide a fresh portal link.
- Encourage customers to download PDFs for their own record keeping.`,
  },
  {
    slug: "customers-paying-invoices",
    category: "client-portal",
    title: "Customers Paying Invoices Online",
    excerpt: "The step-by-step process customers follow to pay through the portal.",
    lastUpdated: "2026-02-22",
    readingTime: 3,
    keywords: ["pay invoice", "customer payment", "portal payment", "online pay", "stripe checkout", "pdf"],
    content: `## Customer Payment Process

Here is exactly what your customer experiences when paying an invoice through the client portal.

## Step-by-Step from the Customer's Perspective

1. **Receive Email** -- The customer gets an email from your business with the invoice summary and a "View & Pay" button.
2. **Open Invoice** -- Clicking the button opens the full invoice in the client portal at a URL like \`/portal/{your-slug}/invoices/{token}\`. They see all line items, tax, discount (if any), and the total amount due.
3. **Download PDF (Optional)** -- A **Download PDF** button lets the customer save a professional PDF copy of the invoice for their records.
4. **Click Pay Now** -- If you have Stripe connected and online payments enabled, the customer clicks the **Pay Now** button on the invoice.
5. **Stripe Checkout** -- The customer is redirected to Stripe Checkout, a secure, hosted payment page. They enter their credit card or debit card information there.
6. **Payment Processed** -- After successful payment, a webhook from Stripe automatically updates the invoice status in JobStream.

## Invoice Portal Details

The invoice portal page displays:

- Your business name, logo, and contact information in the header.
- Invoice number and status badge (Sent, Paid, Overdue, etc.).
- Issue date and due date.
- Full line item table with descriptions, quantities, unit prices, and totals.
- Subtotal, tax, discount, and grand total.
- Payment history showing any previous payments made.
- Customer notes (if included on the invoice).

## For You (The Business)

When the customer completes payment via Stripe Checkout, the following happens automatically via webhook:

- The invoice status changes to **Paid**.
- A payment record is created in your Payments section with method "online."
- Revenue reports update in real time.

## Troubleshooting Customer Payment Issues

If a customer reports they cannot pay:

- **No Pay Now button** -- Verify that Stripe is connected in Settings > Payments and that online payments are enabled.
- **Card declined** -- Ask them to verify their card details or try a different card on the Stripe Checkout page.
- **Page not loading** -- Confirm their internet connection and suggest a different browser.
- **Link expired** -- Resend the invoice from JobStream to generate a fresh email with the portal link.

### Tips

- Test the payment flow yourself by creating a test invoice to understand the customer experience.
- Mention that payments are processed securely through Stripe to build customer confidence.
- Encourage customers to download the PDF for their records before or after paying.`,
  },
  {
    slug: "customers-approving-quotes",
    category: "client-portal",
    title: "Customers Approving Quotes",
    excerpt: "How the quote approval and decline process works from the customer's side.",
    lastUpdated: "2026-02-22",
    readingTime: 3,
    keywords: ["approve quote", "customer approval", "portal approval", "accept quote", "decline quote", "pdf"],
    content: `## Customer Quote Experience

Understanding what your customers see when they receive a quote helps you communicate better and close more deals.

## The Customer's View

1. **Email Arrives** -- The customer receives an email with a summary of your quote: the proposed services, total amount, and expiration date.
2. **Open Quote** -- They click the "View Quote" button to see the full details in the client portal at a URL like \`/portal/{your-slug}/quotes/{token}\`.
3. **Review Details** -- The portal displays:
   - Your business name, logo, and contact information.
   - Quote number and status badge (Awaiting Response, Approved, Declined, Expired).
   - All line items with descriptions, quantities, unit prices, and line totals.
   - Subtotal, tax, and total amount.
   - Your customer message (if included).
   - The expiration date ("Valid Until") for the quote.
4. **Download PDF** -- A **Download PDF** button lets the customer save a professional PDF copy of the quote.
5. **Take Action** -- Two prominent buttons appear: **Approve** and **Decline**.

## Approving a Quote

When the customer clicks **Approve**:

- A confirmation message appears thanking them for their approval.
- The quote status updates to "Approved" immediately on the page.
- You receive a notification in JobStream.

## Declining a Quote

When the customer clicks **Decline**:

- A text area appears where they can explain why they are declining (optional but encouraged).
- They click **Submit Decline** to confirm.
- A confirmation message appears.
- You receive a notification with the decline reason (if provided).
- The quote status updates to "Declined."

## No Account Required

Customers do not need to create an account or remember a password. The email link contains a secure access token that identifies them. This frictionless process leads to faster response rates.

## Mobile Friendly

The quote portal page is fully responsive and works well on phones and tablets. Customers can approve or decline from anywhere.

### Tips

- Write clear, detailed line item descriptions so customers can make confident decisions.
- Keep quotes concise -- overwhelming detail can slow down the approval process.
- Follow up within 24-48 hours if a customer has not responded to a quote.`,
  },
  {
    slug: "customer-service-requests",
    category: "client-portal",
    title: "Customer Service Requests via Public Booking",
    excerpt: "Allow customers to request new work through the public booking form.",
    lastUpdated: "2026-02-22",
    readingTime: 3,
    keywords: ["service request", "new work", "customer request", "booking", "public booking form", "book"],
    content: `## What Is the Public Booking Form?

The public booking form is a standalone page where anyone -- existing customers or new prospects -- can request a service booking from your business. It is accessible at \`/book/{your-org-slug}\` and does not require any login or account.

## Enabling Public Booking

1. Go to **Settings** in the left sidebar.
2. Click the **Booking Widget** tab.
3. Toggle **Online Booking** to on.
4. Select which services from your catalog should appear on the booking form by checking the boxes next to each service.
5. Set the **Slot Duration** (15, 30, 45, 60, 90, or 120 minutes) to control the time slot intervals displayed.
6. Click **Save Changes**.

Your booking URL is displayed on the settings page and can be copied with the **Copy Link** button.

## What the Customer Sees

The public booking form at \`/book/{your-slug}\` walks the customer through a simple multi-step process:

1. **Select Service** -- A dropdown lists the services you have enabled for online booking. Each service shows its name and default price.
2. **Pick Date** -- A date input lets them choose their preferred date.
3. **Pick Time Slot** -- Available time slots are generated based on your business hours for that day of the week. If the selected day is outside your business hours (e.g., a day you are closed), no time slots appear.
4. **Enter Contact Information** -- The customer enters their first name, last name, email, and phone number.
5. **Add Notes (Optional)** -- A text area for any additional details about the work needed.
6. **Submit** -- The customer clicks **Request Booking** to submit.

After submission, a success confirmation appears letting the customer know their request has been received.

## How You Receive Requests

When a customer submits a booking:

1. The request appears in your **Bookings** section with a "Pending" status.
2. You receive a notification (via the notification bell in the top bar).
3. The customer's name, email, phone, selected service, requested date, and time are all captured.

## Managing Booking Requests

From the Bookings page, you can:

- **Confirm & Create Job** -- Accept the booking and create a job on your calendar.
- **Decline** -- Decline the booking with an optional reason.

## Sharing Your Booking URL

Your booking URL follows the pattern \`/book/{your-org-slug}\`. You can share this link:

- On your business website (embed or link).
- On social media profiles and posts.
- In email signatures.
- On printed materials like business cards and flyers.

### Tips

- Keep the service list short and clear to avoid overwhelming visitors.
- Make sure your business hours are configured in Settings > General so that time slots display correctly.
- Respond to booking requests promptly -- speed of response is a major factor in winning new business.`,
  },
  // ============================================
  // ONLINE BOOKING
  // ============================================
  {
    slug: "setting-up-booking-widget",
    category: "online-booking",
    title: "Setting Up Online Booking",
    excerpt: "Configure your online booking form so customers can request services directly.",
    lastUpdated: "2026-02-22",
    readingTime: 3,
    keywords: ["booking widget", "online booking", "configuration", "setup", "booking url", "slot duration"],
    content: `## What Is Online Booking?

Online booking gives your business a public booking page where potential customers can select a service, choose a date and time slot, enter their contact information, and submit a booking request. The page is hosted at \`/book/{your-org-slug}\` and does not require any login.

## Configuring Online Booking

1. Go to **Settings** in the left sidebar.
2. Click the **Booking Widget** tab.
3. Configure the following options:

### Enable Online Booking
Toggle the **Online Booking** switch to turn the feature on or off. When disabled, the booking URL returns an inactive page.

### Available Services
A checklist displays all services from your service catalog. Check the boxes next to services you want to offer for online booking. You might want to offer a subset of your services while handling complex projects through direct consultation.

### Slot Duration
Select the default appointment length from the dropdown. Available options are:

- 15 minutes
- 30 minutes
- 45 minutes
- 60 minutes
- 90 minutes
- 120 minutes

This setting controls how time slots are spaced on the booking form. For example, a 60-minute duration shows slots at 8:00, 9:00, 10:00, etc., while 30-minute shows 8:00, 8:30, 9:00, etc.

### Booking URL
Your unique booking URL is displayed on the settings page. Use the **Copy Link** button to copy it to your clipboard for sharing. The URL follows the pattern \`/book/{your-org-slug}\`.

4. Click **Save Changes** to apply your configuration.

## How Time Slots Work

Time slots on the booking form are generated automatically from your **business hours** (configured in Settings > General). For each day of the week:

- If the day is marked as open, slots are generated from the start time to the end time at intervals matching your slot duration.
- If the day is marked as closed, no time slots are shown and customers cannot book on that day.

## After a Customer Books

All booking requests arrive in your **Bookings** section as pending requests. You review each one and either confirm it (which creates a job on your calendar) or decline it.

### Tips

- Keep the service list short and clear -- too many options can overwhelm visitors.
- Set your business hours accurately in Settings > General before enabling online booking.
- Share your booking URL on your website, social media, email signatures, and printed materials.
- Review pending bookings promptly to provide a responsive customer experience.`,
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

You have two options for each booking request:

### Confirm
Click **Confirm & Create Job** to accept the booking. This:
- Creates a job on your calendar for the requested date and time.
- Sends a confirmation email to the customer with the appointment details.
- Assigns the job to the default team member (or one you select).

### Decline
Click **Decline** if you cannot fulfill the request. You can:
- Add a reason for declining.
- Suggest alternative dates or times.
- The customer receives an email explaining the decline with any message you include.

## Auto-Confirmed Bookings

If you enabled auto-confirmation in your booking settings, requests skip the review step and immediately create confirmed jobs on your calendar. You still receive a notification for each new booking.

### Tips

- Respond to booking requests within one hour during business hours for the best customer experience.
- Use the decline message to offer alternatives rather than just saying no.`,
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
- **SMS** -- Short text messages for time-sensitive notifications like appointment reminders.
- **Both** -- Send via both channels for maximum visibility.

## Enabling and Disabling

Each message type can be individually enabled or disabled in **Settings > Communications**. You have full control over what your customers receive.

### Tips

- At minimum, enable appointment reminders and invoice notifications -- these have the highest impact.
- Use SMS for time-sensitive messages (reminders) and email for detailed content (quotes, invoices).
- Review your automated messages periodically to ensure the tone matches your brand voice.`,
  },
  {
    slug: "configuring-automation-rules",
    category: "communications",
    title: "Configuring Automation Rules",
    excerpt: "Set up automation rules with triggers, channels, templates, and timing.",
    lastUpdated: "2026-02-22",
    readingTime: 3,
    keywords: ["templates", "automation rules", "timing", "configuration", "rules", "triggers", "sms", "email"],
    content: `## Accessing Communications Settings

1. Go to **Settings** in the left sidebar.
2. Click the **Communications** tab.
3. The page has two sections: global SMS/Email toggles at the top, and an Automation Rules table below.

## Global Channel Toggles

At the top of the page, two switches control global messaging capabilities:

- **SMS Notifications** -- Enable or disable all SMS messaging across JobStream.
- **Email Notifications** -- Enable or disable all email messaging across JobStream.

These are master switches. If SMS is disabled globally, no automation rules can send SMS even if individually configured to do so.

## Automation Rules Table

Below the toggles, a table lists all your automation rules. Each row shows the rule name, trigger event, channel (Email, SMS, or Both), delay, and an active/inactive badge.

## Creating a New Automation Rule

1. Click the **Add Rule** button above the table.
2. A dialog opens with the following fields:

### Rule Name
A descriptive name for the automation, such as "Appointment Reminder 24h" or "Post-Job Review Request."

### Trigger
Select the event that fires this automation. Available triggers include:

- **Job Scheduled** -- Fires when a job is scheduled.
- **Job Completed** -- Fires when a job is marked complete.
- **Invoice Sent** -- Fires when an invoice is sent.
- **Invoice Overdue** -- Fires when an invoice becomes overdue.
- **Quote Sent** -- Fires when a quote is sent.
- **Quote Approved** -- Fires when a customer approves a quote.
- **Booking Received** -- Fires when a new booking request comes in.

### Channel
Choose the delivery channel: **Email**, **SMS**, or **Both**.

### Subject (Email Only)
If the channel includes email, enter the subject line for the email.

### Template Content
Write the message body. This is the content of the email or SMS that will be sent.

### Delay (Minutes)
Set the delay in minutes between when the trigger fires and when the message is sent. For example, set 1440 for a 24-hour delay (useful for review requests sent a day after job completion) or 0 for immediate delivery.

3. Click **Save** to create the rule. It is active by default.

## Editing and Deleting Rules

- Click the **pencil icon** on any row to edit the rule. The same dialog opens with the current values pre-filled.
- Click the **trash icon** to delete a rule. A confirmation dialog appears before deletion.

## Activating and Deactivating Rules

Each rule has an active/inactive status shown as a badge. When editing a rule, you can toggle the **Active** switch to enable or disable it without deleting it. Inactive rules remain in your list but do not fire.

### Tips

- Start with the most impactful automations: appointment reminders and invoice payment reminders.
- Use meaningful names so your team can understand what each rule does at a glance.
- Set delays thoughtfully -- a 24-hour delay for review requests gives customers time to evaluate your work before being asked for feedback.`,
  },
  {
    slug: "appointment-reminders",
    category: "communications",
    title: "Appointment Reminders",
    excerpt: "Automatically remind customers about their upcoming appointments via SMS or email.",
    lastUpdated: "2026-02-01",
    readingTime: 2,
    keywords: ["appointment", "reminder", "notification", "sms", "email"],
    content: `## What Are Appointment Reminders?

Appointment reminders are automated messages sent to your customers before a scheduled job. They reduce no-shows, help customers prepare for the visit, and demonstrate professionalism.

## How Reminders Work

1. A job is scheduled on the calendar with a date and time.
2. At the configured interval before the appointment (e.g., 24 hours), JobStream automatically sends a reminder.
3. The customer receives a message with the appointment date, time, and service details.

## Configuring Reminders

1. Go to **Settings > Communications**.
2. Find the **Appointment Reminder** automation rule.
3. Toggle it to **Enabled**.
4. Set your preferred timing (e.g., 24 hours before, 2 hours before).
5. Choose the delivery channel: Email, SMS, or Both.
6. Customize the message template with merge fields like customer name, appointment time, and team member name.

## What the Customer Receives

The reminder message typically includes:

- The appointment date and time.
- A description of the service.
- The assigned team member's name.
- Your business contact information.

You can customize the exact wording in the template editor.

## Best Practices

- Send reminders at least 24 hours in advance so customers can prepare or reschedule if needed.
- Use SMS for reminders since text messages have higher open rates than email.
- Keep reminder messages concise and include only essential details.

### Tips

- Enable reminders for all scheduled jobs to minimize no-shows.
- Consider sending a second reminder 2 hours before the appointment for time-sensitive work.
- Monitor the communications log to verify reminders are being delivered successfully.`,
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
- **Type** -- The message category (quote notification, invoice, reminder, manual message, etc.).
- **Status** -- Delivered, opened, bounced, or failed.
- **Preview** -- A brief preview of the message content.

## Filtering the Log

Use the filter controls to narrow down your view:

- **Type** -- Filter by message type: SMS or Email.
- **Direction** -- Filter by direction: Sent or Received.
- **Status** -- Filter by delivery status: Delivered, Sent, Queued, Failed, or Bounced.

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
    title: "Setting Up Review Links and Auto-Requests",
    excerpt: "Configure your Google, Yelp, and Facebook review page URLs and automatic review requests.",
    lastUpdated: "2026-02-22",
    readingTime: 3,
    keywords: ["review links", "google", "yelp", "facebook", "setup", "auto-request", "delay"],
    content: `## Why Review Links Matter

When JobStream sends automated review requests to your customers, those messages include a direct link to your review page. Setting up these links correctly ensures customers land on the right page with minimal friction.

## Adding Your Review Links

1. Go to **Settings** in the left sidebar.
2. Click the **Reviews** tab.
3. The page has two sections: Review Platform URLs and Auto-Request Settings.

### Google Business Profile URL
1. Search for your business on Google Maps.
2. Click your business listing.
3. Click **Write a Review** and copy the URL from your browser's address bar.
4. Paste this URL into the Google Review URL field in JobStream.

### Yelp URL
1. Go to your Yelp business page.
2. Copy the URL from your browser's address bar.
3. Paste it into the Yelp Review URL field.

### Facebook URL
1. Go to your Facebook business page.
2. Click the **Reviews** tab.
3. Copy the URL.
4. Paste it into the Facebook Review URL field.

## Auto-Request Settings

Below the review URLs, the Reviews settings page includes controls for automatically requesting reviews after job completion:

### Auto-Request Reviews Toggle
A switch that enables or disables automatic review requests. When enabled, JobStream will automatically send a review request to customers after their job is completed.

### Request Delay (Hours)
A number input that sets how many hours after job completion the review request is sent. The default is 24 hours. Common settings:

- **1 hour** -- While the experience is fresh. Best for short service calls.
- **24 hours** -- Gives the customer time to evaluate. Best for larger projects.
- **48 hours** -- For projects where the customer needs time to test the work.

## Saving Your Settings

Click **Save Changes** at the bottom of the page to apply your review URL and auto-request configuration.

### Tips

- Focus on one or two platforms rather than spreading reviews too thin across many sites.
- Google reviews are generally the most valuable for local service businesses.
- Update your links if you change your business name or if the platform updates their URL structure.
- The auto-request delay is a key lever -- experiment to find the timing that gets the best response rate.`,
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
- **Response Rate** -- The percentage of reviews that have a response from your business.

## Adding Reviews Manually

While automated tracking captures reviews from some sources, you can also add reviews manually:

1. Click **Add Review**.
2. Select the platform (Google, Yelp, Facebook, or Other).
3. Enter the reviewer's name, rating, review text, and date.
4. Click **Save**.

This is useful for tracking reviews that come in through platforms JobStream does not automatically monitor.

## Responding to Reviews

Responding to reviews -- both positive and negative -- shows customers that you value their feedback. You can track your responses directly in JobStream:

1. Expand a review by clicking on it.
2. Write your response in the **Write a Response** text area.
3. Click **Save Response** to save your reply.

We recommend responding to all reviews within 24-48 hours. Note that responses saved in JobStream are for your records -- you should also post your response directly on the respective review platform.

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
    excerpt: "Understand the summary cards, charts, and action widgets on your main dashboard.",
    lastUpdated: "2026-02-22",
    readingTime: 4,
    keywords: ["dashboard", "overview", "summary", "cards", "charts", "metrics", "today schedule", "action required", "notifications"],
    content: `## The Main Dashboard

When you log into JobStream, the Dashboard is your home base. It greets you by name and provides a quick snapshot of your business health with summary cards, visual charts, and action-oriented widgets.

## Summary Cards

The top of the dashboard displays four key performance indicators, each with a comparison to the prior period:

### Revenue This Month
Your total collected revenue for the current month. This updates in real time as payments are received. A percentage change indicator shows the trend compared to last month.

### Jobs Completed
The number of jobs marked as completed this month. Helps you gauge team productivity.

### Outstanding Invoices
The total dollar amount of unpaid invoices. This includes both current and overdue amounts.

### Quote Conversion
Your quote conversion rate, showing the percentage of quotes that have been approved. This helps you track sales effectiveness.

## Charts and Graphs

Below the summary cards, the dashboard includes two visual analytics panels side by side:

### Revenue Chart
A line chart showing revenue over time for the current month, with data points for each day. Hover over any point to see the exact revenue for that date.

### Job Status Breakdown
A donut chart showing the distribution of job statuses (Scheduled, In Progress, Completed, Cancelled) with a total count in the center. A color-coded legend identifies each status.

## Today's Schedule

The **Today's Schedule** widget shows all jobs scheduled for the current day. Each entry displays:

- Job title
- Customer name
- Scheduled time
- Assigned team member

Click any job to navigate directly to the job detail page. If no jobs are scheduled for today, the widget displays a "No jobs scheduled" message with a link to the calendar.

## Action Required

The **Action Required** widget highlights items that need your immediate attention. It shows three categories:

- **Overdue Invoices** -- Invoices past their due date, with the customer name, invoice number, and amount. Each links directly to the invoice detail page.
- **Pending Quotes** -- Quotes awaiting customer response, with the customer name, quote number, and total. Each links to the quote detail page.
- **Pending Bookings** -- Booking requests that need to be confirmed or declined, with the customer name, service, and requested date. Each links to the bookings page.

## Recent Activity and Upcoming Jobs

The dashboard also includes:

- **Recent Activity** -- A timeline of the latest actions: jobs completed, invoices sent, payments received, quotes sent, and new customers added. Each entry is timestamped and clickable.
- **Upcoming Jobs** -- A list of the next scheduled jobs with dates, customer names, and statuses.

## Notification Bell

In the top bar, the **notification bell** icon shows your unread notification count as a red badge. Clicking it opens a dropdown with your most recent notifications. Each notification shows a title, message, and timestamp. You can:

- Click a notification to navigate to the relevant page (job, invoice, quote, etc.).
- Click **Mark as read** on individual notifications.
- Click **Mark all as read** to clear all unread notifications.

Notifications are polled every 30 seconds so they stay current without requiring a page refresh.

### Tips

- Start each work day by reviewing the dashboard for 60 seconds to understand the state of your business.
- Use the Action Required widget to prioritize your morning tasks -- overdue invoices and pending bookings need prompt attention.
- Pay attention to the Outstanding Invoices card -- a rising number means your collection process may need attention.
- Check the notification bell regularly for real-time updates from your team and customers.`,
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
- **Avg. Per Job** -- Total revenue divided by completed jobs.
- **Largest Invoice** -- The highest-value invoice in the period.

### Revenue Over Time
A chart showing revenue trends over the selected period. You can view this daily, weekly, or monthly to identify patterns and growth trends.

### Revenue by Service
A breakdown of revenue by service type. See which services generate the most income for your business.

### Revenue by Customer
Identifies your highest-value customers by total spend. Useful for understanding customer lifetime value.

## Filtering

The reports page uses a date preset filter to narrow the time period. Available presets include:

- **This Week** -- Current week's data.
- **This Month** -- Current month's data.
- **Last Month** -- Previous month's data.
- **This Quarter** -- Current quarter's data.
- **This Year** -- Year-to-date data.

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
A breakdown showing how many jobs are in each status (Scheduled, In Progress, Completed, Cancelled). Identifies bottlenecks in your workflow.

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
A visual funnel showing Quotes Sent, Approved, and Converted to Job. Identify where prospects drop off.

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

## Customers Report

Access this from **Reports > Customers**. Understand your customer base:

### Key Metrics
- **Total Customers** -- The number of customers in your system.
- **New Customers** -- How many new customers were added in the period.
- **Active Customers** -- Customers with jobs or invoices in the period.

## Report Tabs Summary

The Reports page has five tabs: **Revenue**, **Jobs**, **Quotes**, **Team**, and **Customers**. Each tab uses the same date preset filter (This Week, This Month, etc.) to control the time period.

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
    excerpt: "Update your name, email, phone, and password in your personal profile.",
    lastUpdated: "2026-02-01",
    readingTime: 2,
    keywords: ["profile", "name", "email", "password", "phone", "personal"],
    content: `## Accessing Your Profile

1. Click your name or avatar in the **top-right corner** of the top bar.
2. Select **Profile** from the menu.
3. Your personal profile page opens.

Note: Profile is accessed from the top bar, not the sidebar. The sidebar is for navigating to business sections like Dashboard, Customers, Jobs, etc.

## Updating Your Information

The profile page has the following fields:

### First Name
Your first name as it appears on job assignments and internal communications.

### Last Name
Your last name.

### Email
Your login email address. This is also used for receiving notifications from JobStream.

### Phone
Your direct phone number. This is not shared with customers.

## Changing Your Password

The profile page has a password section with three fields:

1. **Current Password** -- Enter your existing password for verification.
2. **New Password** -- Enter your new password.
3. **Confirm New Password** -- Type the new password again to confirm.

Click **Update Password** to save.

Password requirements:
- Minimum 8 characters.

### Tips

- Choose a strong, unique password and change it periodically.
- Keep your email address up to date so you receive important notifications.`,
  },
  {
    slug: "business-settings",
    category: "account-settings",
    title: "Business Settings",
    excerpt: "Configure your business info, tax rates, document prefixes, and operating hours.",
    lastUpdated: "2026-02-01",
    readingTime: 3,
    keywords: ["business settings", "company", "tax", "hours", "configuration", "prefixes"],
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

## Tax Settings

### Default Tax Rate
Set the standard tax rate that auto-applies to taxable line items on quotes and invoices. Enter the percentage (e.g., 8.25 for 8.25% sales tax).

## Business Hours

Define your standard operating hours for each day of the week. Each day has:

- A **Switch toggle** to enable or disable that day.
- A **Start Time** field for when your business opens.
- An **End Time** field for when your business closes.

These hours are used for:

- The online booking widget (customers can only book during business hours).
- The client portal display.
- Scheduling suggestions and capacity planning.

## Document Prefixes

Customize the prefixes for your document numbers:

- **Invoice Prefix** -- Customize the prefix for invoice numbers (e.g., "INV-").
- **Quote Prefix** -- Customize the prefix for quote numbers (e.g., "QT-").
- **Job Prefix** -- Customize the prefix for job numbers (e.g., "JOB-").

## Invoice and Quote Defaults

- **Default Invoice Due (days)** -- A number input that sets how many days after the invoice date payment is due. Enter a number like 15 or 30.
- **Default Quote Validity (days)** -- A number input that sets how many days a quote remains valid before expiring.

### Tips

- Review your tax settings with your accountant to ensure compliance with local regulations.
- Update business hours seasonally if your schedule changes (extended summer hours, holiday closures).`,
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

1. Click **Invite Team Member**.
2. Enter their first name, last name, and email address.
3. Select a role (Owner, Admin, or Technician).
4. Click **Send Invite**.

The new member receives an email with instructions to set up their password and log in.

## Managing Team Members

Team members are managed through the dropdown action menu on each row of the team list. There is no click-to-edit detail view. From the dropdown action menu, you can:

- **Change to Admin** or **Change to Technician** -- Adjust the team member's role.
- **Deactivate** -- Remove the team member's access.

## Deactivating a Team Member

When someone leaves your company, deactivate their account rather than deleting it:

1. Find the team member in the team list.
2. Open the dropdown action menu.
3. Click **Deactivate**.
4. Confirm the action.

Deactivated members:
- Cannot log in.
- Are removed from scheduling options.
- Their historical data (completed jobs, notes, etc.) is preserved.
- Can be reactivated if they return.

## Reactivating a Member

If a team member returns, open their dropdown action menu and click **Activate** to restore their access.

### Tips

- Always deactivate rather than delete departing employees to preserve their work history.
- Review team roles quarterly to ensure they match current responsibilities.`,
  },
  {
    slug: "roles-and-permissions",
    category: "account-settings",
    title: "Understanding Roles and Permissions",
    excerpt: "Detailed breakdown of what each role can access and do in JobStream.",
    lastUpdated: "2026-02-01",
    readingTime: 3,
    keywords: ["roles", "permissions", "owner", "admin", "technician", "access"],
    content: `## Role Overview

JobStream uses a role-based access control system with three built-in roles: **Owner**, **Admin**, and **Technician**. Each role has a specific set of permissions designed for different responsibilities within your business.

## Owner Role

The Owner role has unrestricted access to every feature in JobStream. This is the role assigned to the person who created the account. There can only be one Owner.

### Owner Permissions
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
- Full billing and account-level access.

## Admin Role

Admins have full access to nearly everything in JobStream. This role is intended for senior office staff and trusted managers.

### Admin Permissions
- Full customer management.
- Create, send, and manage quotes.
- Create, assign, and manage all jobs (including other team members' jobs).
- Create, send, and manage invoices.
- Record payments.
- View and export reports.
- Access settings.
- Invite and manage team members.
- Connect and manage integrations.

## Technician Role

Technicians have a focused view designed for fieldwork. They see only what they need to do their jobs efficiently.

### Technician Permissions
- View their own assigned jobs.
- Update job status (in progress, complete).
- Add notes, photos, and checklist updates to their jobs.
- View customer contact info and property details for their assigned jobs.
- View their own schedule on the calendar.
- Cannot create quotes, invoices, or new jobs.
- Cannot view financial data or reports.
- Cannot access settings.
- Cannot see other team members' schedules.

## Choosing the Right Role

| Responsibility | Recommended Role |
|---|---|
| Business owner | Owner |
| Office manager | Admin |
| Dispatcher / coordinator | Admin |
| Crew lead | Admin |
| Field technician | Technician |
| Part-time helper | Technician |

## Changing a Team Member's Role

Owners and Admins can change team member roles:

1. Go to **Settings > Team**.
2. Open the dropdown action menu for the team member.
3. Select **Change to Admin** or **Change to Technician**.

The change takes effect immediately. The team member may need to refresh their browser to see the updated navigation.

### Tips

- Start with the most restrictive role that fits the person's job duties and escalate if needed.
- When in doubt, Admin is a good choice for trusted office staff who need broad access.
- Periodically audit roles to ensure they still match each person's actual responsibilities.`,
  },
  // ============================================
  // PDF GENERATION
  // ============================================
  {
    slug: "downloading-pdf-documents",
    category: "invoicing-payments",
    title: "Downloading PDF Documents",
    excerpt: "Generate and download professional PDF copies of invoices and quotes.",
    lastUpdated: "2026-02-22",
    readingTime: 2,
    keywords: ["pdf", "download", "invoice pdf", "quote pdf", "print", "document"],
    content: `## PDF Generation Overview

JobStream lets you generate professional PDF documents for invoices and quotes. PDFs are available both from within your dashboard and from the public client portal.

## Downloading an Invoice PDF

### From the Dashboard
1. Navigate to **Invoices** in the left sidebar.
2. Click on the invoice you want to download.
3. On the invoice detail page, click the **Download PDF** button.
4. The PDF is generated on the server and downloaded to your device.

### From the Client Portal
Customers can also download invoice PDFs from the portal. When viewing an invoice at \`/portal/{your-slug}/invoices/{token}\`, a **Download PDF** button is available. This uses a separate public endpoint that validates the access token.

## Downloading a Quote PDF

### From the Dashboard
1. Navigate to **Quotes** in the left sidebar.
2. Click on the quote you want to download.
3. On the quote detail page, click the **Download PDF** button.

### From the Client Portal
Customers can download quote PDFs from the portal at \`/portal/{your-slug}/quotes/{token}\` using the **Download PDF** button.

## What the PDF Includes

Both invoice and quote PDFs include a professional layout with:

- Your business name, logo (if configured), and contact information in the header.
- Document number, date, and status.
- Customer name and contact details.
- A line item table with descriptions, quantities, unit prices, and line totals.
- Subtotal, tax, discount (if applicable), and grand total.
- Any notes included on the document.

## Use Cases

- **Record keeping** -- Save PDFs for your accounting records or tax documentation.
- **Customer requests** -- Send a PDF directly to a customer who prefers email attachments.
- **Printing** -- Print the PDF for customers who prefer paper copies.
- **Offline access** -- Customers can save the PDF for reference without needing internet access.

### Tips

- PDFs reflect the current state of the document at the time of download.
- Encourage customers to download PDFs from the portal for their own records.
- Keep your business information up to date in Settings > General since it appears on every PDF.`,
  },
  // ============================================
  // SETTINGS PAGES (DETAILED)
  // ============================================
  {
    slug: "payment-settings",
    category: "account-settings",
    title: "Payment Settings",
    excerpt: "Configure Stripe Connect, online payments, and payment preferences.",
    lastUpdated: "2026-02-22",
    readingTime: 3,
    keywords: ["payment settings", "stripe", "online payments", "connect", "disconnect", "configuration"],
    content: `## Accessing Payment Settings

1. Click **Settings** in the left sidebar.
2. Click the **Payments** tab.

## Stripe Connection Status

The top of the page shows your current Stripe connection status:

### Not Connected
If Stripe is not connected, you see a **Connect with Stripe** button. Clicking it initiates the Stripe Connect onboarding flow (see the "Connecting Stripe for Payments" article for full details).

### Connected
If Stripe is connected and onboarded, you see:
- A green "Connected" badge.
- Your masked Stripe account ID (first 4 and last 4 characters visible).
- A **Disconnect** button to remove the Stripe connection.

## Online Payments Toggle

Below the connection status, a **Online Payments** switch controls whether customers see the "Pay Now" button on invoices in the client portal.

- **Enabled** -- Invoices in the portal display a Pay Now button that initiates Stripe Checkout.
- **Disabled** -- Invoices are viewable in the portal but no payment button is shown.

This toggle requires Stripe to be connected. If Stripe is not connected, the toggle is not functional.

## Disconnecting Stripe

If you need to disconnect your Stripe account:

1. Click the **Disconnect** button.
2. A confirmation dialog appears warning that customers will no longer be able to pay online.
3. Click **Disconnect** to confirm.

After disconnecting, the online payments toggle is automatically turned off and the page reverts to showing the "Connect with Stripe" button.

### Tips

- Keep online payments enabled at all times for the fastest payment collection.
- Only disconnect Stripe if you are switching to a different Stripe account or no longer want to accept online payments.
- Changes to the online payments toggle take effect immediately on all portal invoice pages.`,
  },
  {
    slug: "communications-settings",
    category: "account-settings",
    title: "Communications Settings",
    excerpt: "Configure SMS, email, and automation rules for customer communications.",
    lastUpdated: "2026-02-22",
    readingTime: 3,
    keywords: ["communications settings", "sms", "email", "automation", "rules", "templates"],
    content: `## Accessing Communications Settings

1. Click **Settings** in the left sidebar.
2. Click the **Communications** tab.

## Global Channel Toggles

At the top of the page, two switches control messaging at a global level:

- **SMS Notifications** -- Master switch for all SMS messaging. When disabled, no SMS messages are sent regardless of individual automation rule settings.
- **Email Notifications** -- Master switch for all email messaging. When disabled, no email messages are sent.

Toggling either switch and clicking **Save Changes** applies the change immediately.

## Automation Rules

Below the global toggles, a table lists all your automation rules. Each row displays:

- **Rule name** -- A descriptive label you choose.
- **Trigger** -- The event that fires the rule (e.g., Job Completed, Invoice Sent).
- **Channel** -- Email, SMS, or Both.
- **Delay** -- How many minutes after the trigger the message is sent.
- **Status** -- An Active or Inactive badge.
- **Actions** -- Edit (pencil icon) and Delete (trash icon) buttons.

## Creating Rules

Click **Add Rule** to create a new automation rule. The dialog includes:

- **Name** -- Required. A descriptive name for the rule.
- **Trigger** -- Required. Select from: Job Scheduled, Job Completed, Invoice Sent, Invoice Overdue, Quote Sent, Quote Approved, or Booking Received.
- **Channel** -- Required. Choose Email, SMS, or Both.
- **Subject** -- The email subject line (only shown when channel includes Email).
- **Template Content** -- Required. The message body.
- **Delay (Minutes)** -- How many minutes to wait after the trigger fires. Use 0 for immediate, 60 for one hour, 1440 for one day.
- **Active** -- A toggle to enable or disable the rule. Active by default.

Click **Save** to create the rule. It appears immediately in the table.

## Editing and Deleting Rules

- Click the pencil icon to edit any rule. All fields can be modified.
- Click the trash icon to delete a rule. A confirmation dialog appears before permanent deletion.

### Tips

- Create separate rules for different timing scenarios (e.g., one appointment reminder 24 hours before and another 2 hours before).
- Use the global SMS toggle to quickly disable all text messaging if needed (e.g., during off-hours).
- Start with a few essential rules and add more as you learn which automations are most valuable for your business.`,
  },
  {
    slug: "booking-widget-settings",
    category: "account-settings",
    title: "Booking Widget Settings",
    excerpt: "Configure your online booking form, available services, slot duration, and shareable URL.",
    lastUpdated: "2026-02-22",
    readingTime: 2,
    keywords: ["booking settings", "booking widget", "slot duration", "booking url", "services"],
    content: `## Accessing Booking Settings

1. Click **Settings** in the left sidebar.
2. Click the **Booking Widget** tab.

## Configuration Options

### Online Booking Toggle
A switch to enable or disable the public booking form. When disabled, the booking URL returns an inactive page.

### Available Services
A checklist of all services in your catalog. Check the services you want to make available for online booking. Customers will see these services in a dropdown on the booking form.

### Slot Duration
A dropdown to set the interval between available time slots. Options include:

- 15 minutes
- 30 minutes
- 45 minutes
- 60 minutes (default)
- 90 minutes
- 120 minutes

The slot duration determines how time slots are spaced based on your business hours. For example, if your hours are 8:00 AM to 5:00 PM and the slot duration is 60 minutes, slots appear at 8:00, 9:00, 10:00, etc.

### Booking URL
Your unique booking URL is displayed on the page. Two copy buttons are available:

- **Copy Link** -- Copies the direct URL (e.g., \`https://yoursite.com/book/your-slug\`) for sharing in emails, social media, or messaging.
- **Copy Embed** -- Copies an HTML snippet for embedding on your website.

## Saving Changes

Click **Save Changes** at the bottom of the form to apply your configuration. Changes take effect immediately on the public booking page.

### Tips

- Only enable services that have predictable durations and pricing for online booking. Complex services are better handled through direct quotes.
- Set the slot duration to match the average length of your most common service.
- Make sure your business hours are configured in Settings > General before enabling online booking.`,
  },
  {
    slug: "review-settings",
    category: "account-settings",
    title: "Review Settings",
    excerpt: "Configure review platform URLs and automatic review request settings.",
    lastUpdated: "2026-02-22",
    readingTime: 2,
    keywords: ["review settings", "google reviews", "yelp", "facebook", "auto-request", "delay"],
    content: `## Accessing Review Settings

1. Click **Settings** in the left sidebar.
2. Click the **Reviews** tab.

## Review Platform URLs

Enter the URLs for each review platform where you want to collect customer reviews:

- **Google Review URL** -- The direct link to your Google Business Profile review page.
- **Yelp Review URL** -- The link to your Yelp business listing.
- **Facebook Review URL** -- The link to your Facebook page reviews section.

These URLs are included in review request messages sent to customers. Leave a field blank if you do not use that platform.

## Auto-Request Settings

### Auto-Request Reviews Toggle
A switch to enable or disable automatic review requests after job completion. When enabled, JobStream sends a review request to the customer after each completed job.

### Request Delay (Hours)
A number field that sets how many hours to wait after job completion before sending the review request. Common values:

- **1** -- Ask immediately while the experience is fresh.
- **24** -- Wait a day for the customer to evaluate the work (recommended default).
- **48** -- Wait two days for projects where results take time to assess.

## Saving Changes

Click **Save Changes** to apply your review configuration. The auto-request setting takes effect for all future job completions.

### Tips

- Google reviews have the highest impact on local search rankings, so prioritize filling in the Google Review URL.
- A 24-hour delay strikes a good balance between timeliness and giving customers time to evaluate your work.
- Monitor your review volume in the Reviews section to gauge the effectiveness of your auto-request settings.`,
  },
  // ============================================
  // TIME TRACKING & EXPORTS
  // ============================================
  {
    slug: "time-tracking-timer",
    category: "job-management",
    title: "Using the Time Tracking Timer",
    excerpt: "Start, stop, and discard time entries with the built-in job timer.",
    lastUpdated: "2026-02-22",
    readingTime: 3,
    keywords: ["timer", "time tracking", "start", "stop", "discard", "clock", "hours"],
    content: `## What Is the Timer?

The time tracking timer lets your team track how long they spend on jobs. It is wired to server-side actions, so timer state persists across page loads and browser sessions. If a technician starts a timer and navigates away or refreshes, the timer continues running.

## Starting a Timer

There are two ways to start tracking time:

### From the Time Tracking Page
1. Click **Time Tracking** in the left sidebar.
2. Click the **Start Timer** button.
3. The timer begins counting up, displaying hours and minutes.

### From a Job Detail Page
1. Open a job detail page.
2. Click the **Time** tab.
3. Click **Start Timer** to begin tracking time for that specific job.

## Stopping a Timer

When you finish working, click the **Stop** button on the active timer. This creates a time entry record with:

- Start time
- End time
- Total duration
- The job it was associated with (if started from a job)
- The team member who tracked the time

## Discarding a Timer

If you started a timer by mistake, click the **Discard** button to cancel it without creating a time entry. The timer resets and no record is saved.

## Timer Persistence

The timer state is stored on the server, not just in your browser. This means:

- Refreshing the page does not lose your active timer.
- Closing and reopening your browser shows the timer still running.
- The elapsed time is calculated from the server-recorded start time, ensuring accuracy.

## Viewing Time Entries

All completed time entries appear on the **Time Tracking** page in a list format. Each entry shows:

- Team member name
- Associated job (if any)
- Start and end time
- Duration
- Date

## Exporting Time Data

Click the **Export** button on the Time Tracking page to download all visible time entries as a CSV file. This is useful for:

- Payroll processing
- Client billing for hourly work
- Productivity analysis
- Importing into accounting software

### Tips

- Encourage technicians to start the timer when they arrive at a job site and stop it when they leave.
- Use the discard feature if a timer was started accidentally rather than creating a zero-duration entry.
- Export time data regularly for payroll and billing purposes.`,
  },
  {
    slug: "csv-exports",
    category: "reports-analytics",
    title: "Exporting Data to CSV",
    excerpt: "Export payments, time tracking, and report data as CSV files.",
    lastUpdated: "2026-02-22",
    readingTime: 2,
    keywords: ["csv", "export", "download", "payments", "time tracking", "data", "spreadsheet"],
    content: `## CSV Export Overview

JobStream supports CSV (Comma Separated Values) exports from several pages, making it easy to get your data into spreadsheets, accounting software, or other tools.

## Pages with CSV Export

### Payments Page
1. Navigate to **Payments** in the left sidebar.
2. Apply any filters you need (date range, payment method, status).
3. Click the **Export** button.
4. A CSV file downloads containing all payments matching your current filters.

The payments CSV includes: customer name, invoice number, amount, payment method, date, status, and reference.

### Time Tracking Page
1. Navigate to **Time Tracking** in the left sidebar.
2. Click the **Export** button.
3. A CSV file downloads containing all time entries.

The time tracking CSV includes: team member name, job reference, start time, end time, duration, and date.

### Reports Page
The Reports page also supports CSV export for revenue data. Click the **Export** button on the Reports page to download the current report view.

## How Exports Work

- Exports include all data matching your current filters and view settings.
- Filter your data first, then export to get only the subset you need.
- CSV files can be opened in Excel, Google Sheets, Numbers, or any spreadsheet application.
- The filename includes the data type and date for easy identification.

## Common Use Cases

- **Accounting** -- Export payment data monthly for your bookkeeper or to import into QuickBooks, Xero, or FreshBooks.
- **Payroll** -- Export time tracking data to calculate employee hours and wages.
- **Tax preparation** -- Export annual payment data for tax filing.
- **Analysis** -- Import data into a spreadsheet for custom reports and visualizations.

### Tips

- Export data at regular intervals (weekly or monthly) to maintain up-to-date records in your accounting system.
- Use date range filters before exporting to get clean, period-specific data.
- Keep exported CSV files organized in folders by month or quarter for easy retrieval.`,
  },
  // ============================================
  // JOB EDITING
  // ============================================
  {
    slug: "editing-a-job",
    category: "job-management",
    title: "Editing a Job",
    excerpt: "Modify job details, schedule, assignments, and line items after creation.",
    lastUpdated: "2026-02-22",
    readingTime: 2,
    keywords: ["edit job", "modify", "update", "change", "job details"],
    content: `## Editing an Existing Job

After creating a job, you can edit any of its details at any time (as long as the job is not completed or cancelled).

## How to Edit a Job

1. Navigate to the job detail page by clicking the job in your Jobs list or Calendar.
2. Click the **Edit** button on the job detail page.
3. You are taken to the job edit form at \`/jobs/{id}/edit\`.
4. The form is pre-populated with all current job details.

## Editable Fields

The edit form includes all the same fields as the creation form:

- **Customer** -- Change the associated customer.
- **Job Title** -- Update the job description.
- **Line Items** -- Add, remove, or modify line items with descriptions, quantities, and prices.
- **Schedule** -- Change the start date, start time, and end time.
- **Priority** -- Adjust the priority level (Low, Medium, High, Urgent).
- **Assignment** -- Reassign to different team members.
- **Notes** -- Update internal notes.
- **Checklist** -- Add or modify checklist items.
- **Recurring Settings** -- Modify the recurrence pattern if this is a recurring job.

## Saving Changes

Click **Update Job** to save your changes. The job detail page updates immediately with the new information, and the calendar reflects any schedule changes.

## When You Cannot Edit

Jobs in **Completed** or **Cancelled** status cannot be edited through the edit form. If you need to make changes to a completed job, you will need to change its status back to an active state first.

### Tips

- Review line items before creating an invoice to ensure they reflect the actual work performed.
- Update the schedule promptly when a customer reschedules to keep the calendar accurate.
- Use the edit page rather than re-creating a job to preserve the job's history and linked records.`,
  },
  // ============================================
  // JOB CHECKLIST (DETAILED)
  // ============================================
  {
    slug: "job-checklists",
    category: "job-management",
    title: "Using Job Checklists",
    excerpt: "Add checklist items during job creation and track completion in the field.",
    lastUpdated: "2026-02-22",
    readingTime: 2,
    keywords: ["checklist", "tasks", "items", "completion", "toggle", "job creation"],
    content: `## What Are Job Checklists?

Job checklists are task lists attached to individual jobs. They help ensure that every step of a job is completed consistently, especially for complex or multi-step services.

## Adding Checklist Items During Job Creation

When creating a new job (or editing an existing one):

1. Scroll to the **Checklist** section of the job form.
2. Type a label for the checklist item in the input field.
3. Click the **+** button (or press Enter) to add the item.
4. Repeat for each item you want to include.
5. To remove an item before saving, click the **X** button next to it.

Checklist items are saved when you create or update the job.

## Tracking Completion on the Job Detail Page

Once the job is created, the checklist appears on the job detail page under the **Checklist** tab:

- Each item displays its label with a checkbox.
- Click the checkbox to toggle the item between **completed** and **not completed**.
- Completion changes are saved to the server immediately -- no need to click a separate save button.
- Completed items show a checkmark indicator.

## Progress Tracking

The Checklist tab header shows the completion count (e.g., "2/5 completed") so you can see at a glance how much of the job is done.

## Best Practices for Checklists

- **Standard checklists** -- Create consistent checklists for each service type (e.g., "HVAC Inspection" always includes "Check filters," "Test thermostat," "Inspect ductwork").
- **Safety items** -- Include safety checks as checklist items to ensure compliance.
- **Quality control** -- Add final inspection items like "Clean work area" and "Test all fixtures."
- **Documentation** -- Include "Take before photo" and "Take after photo" as checklist items.

### Tips

- Keep checklist items short and actionable.
- Use checklists to train new team members on your standard procedures.
- Review completed checklists before marking a job as complete to ensure nothing was missed.`,
  },
  // ============================================
  // FILE UPLOADS (DETAILED)
  // ============================================
  {
    slug: "job-file-uploads",
    category: "job-management",
    title: "Uploading Files to Jobs",
    excerpt: "Attach photos, documents, and other files to job records.",
    lastUpdated: "2026-02-22",
    readingTime: 2,
    keywords: ["upload", "files", "attachments", "photos", "documents", "drag and drop"],
    content: `## File Attachments Overview

Every job in JobStream supports file attachments. You can upload photos, documents, permits, diagrams, or any other files that are relevant to the job. Files are stored on the server and accessible from the job detail page.

## How to Upload Files

1. Open the job detail page.
2. Click the **Attachments** tab.
3. You have two upload methods:

### Drag and Drop
Drag files from your computer's file manager directly onto the dashed upload zone on the page. The zone highlights when files are dragged over it. Drop the files to begin uploading.

### Click to Browse
Click the **Browse Files** button (or click anywhere in the upload zone) to open your device's file picker. Select one or more files and confirm.

## Upload Behavior

- Multiple files can be uploaded at once.
- Each file uploads individually and shows a success notification when complete.
- The upload zone displays "Uploading..." while files are being processed.
- After upload, files appear immediately in the attachments grid below the upload zone.

## Viewing Attachments

Uploaded files appear in a grid layout showing:

- File name
- File size (formatted as KB or MB)
- Upload date
- A clickable link to download or view the file

## Supported Files

You can upload any file type. Common uploads include:

- **Photos** -- Before/after pictures, site conditions, completed work.
- **Documents** -- Permits, warranties, specifications, customer agreements.
- **Diagrams** -- Wiring diagrams, floor plans, schematics.
- **Receipts** -- Material purchase receipts for job costing.

### Tips

- Upload before and after photos for every job to build a visual record.
- Use descriptive file names before uploading so they are easy to identify later.
- Drag and drop is the fastest method when uploading multiple files from your desktop.`,
  },
  // ============================================
  // PORTAL PAGES (DETAILED)
  // ============================================
  {
    slug: "invoice-portal-page",
    category: "client-portal",
    title: "Invoice Portal Page",
    excerpt: "Detailed look at what customers see on the invoice portal page.",
    lastUpdated: "2026-02-22",
    readingTime: 3,
    keywords: ["invoice portal", "portal", "pay invoice", "pdf", "stripe checkout", "line items"],
    content: `## Invoice Portal Overview

The invoice portal page is a public, customer-facing page where your customers view and pay invoices. It is accessible at \`/portal/{your-org-slug}/invoices/{access-token}\` -- no login required.

## Page Layout

### Header
The top of the page displays your business name and logo (if configured). It serves as the branding element so customers know who the invoice is from.

### Invoice Summary
Below the header, customers see:

- **Invoice Number** -- The unique identifier (e.g., INV-001).
- **Status Badge** -- Color-coded badge showing the current status: Draft (gray), Sent (blue), Paid (green), Overdue (red), or Void (gray).
- **Issue Date** -- When the invoice was created.
- **Due Date** -- When payment is expected.

### Customer Information
The customer's name, email, and phone number are displayed.

### Line Items Table
A detailed table showing every line item on the invoice:

| Column | Description |
|---|---|
| Item | Service name and description |
| Qty | Quantity |
| Price | Unit price |
| Total | Line total (qty x price) |

### Totals Section
Below the table:
- **Subtotal** -- Sum of all line items before tax and discount.
- **Tax** -- Tax amount applied.
- **Discount** -- Discount amount (if any).
- **Total** -- The final amount due.

### Payment History
If any payments have been recorded, a payment history section shows each payment with its date, amount, method, and status.

### Notes
Any customer-visible notes included on the invoice appear at the bottom.

## Action Buttons

Two primary actions are available:

- **Download PDF** -- Generates and downloads a professional PDF of the invoice.
- **Pay Now** -- Visible only when Stripe is connected, online payments are enabled, and the invoice has an outstanding balance. Clicking this button redirects the customer to Stripe Checkout where they can enter payment information securely.

The Pay Now button does not appear if:
- Stripe is not connected.
- Online payments are disabled.
- The invoice is already fully paid.
- The invoice is voided.

### Tips

- Share the direct invoice portal link with customers who need to access their invoice again.
- The portal page is mobile-responsive and works well on phones and tablets.
- Customers can bookmark the invoice URL for future reference.`,
  },
  {
    slug: "quote-portal-page",
    category: "client-portal",
    title: "Quote Portal Page",
    excerpt: "Detailed look at what customers see on the quote portal page.",
    lastUpdated: "2026-02-22",
    readingTime: 3,
    keywords: ["quote portal", "portal", "approve", "decline", "pdf", "customer view"],
    content: `## Quote Portal Overview

The quote portal page is a public, customer-facing page where your customers review, approve, or decline quotes. It is accessible at \`/portal/{your-org-slug}/quotes/{access-token}\` -- no login required.

## Page Layout

### Header
Your business name and logo (if configured) appear at the top for branding.

### Quote Summary
- **Quote Number** -- The unique identifier (e.g., QT-001).
- **Status Badge** -- Color-coded badge showing: Draft (gray), Awaiting Response (blue), Approved (green), Declined (red), or Expired (orange).
- **Created Date** -- When the quote was created.
- **Valid Until** -- The expiration date after which the customer can no longer approve.

### Customer Information
The customer's name, email, and phone number.

### Customer Message
If you included a personal message when creating the quote, it appears prominently in a blue highlighted section above the line items.

### Line Items Table
A detailed table showing every line item:

| Column | Description |
|---|---|
| Item | Service name and description |
| Qty | Quantity |
| Price | Unit price |
| Total | Line total (qty x price) |

### Totals Section
- **Subtotal** -- Sum of all line items.
- **Tax** -- Tax amount applied.
- **Total** -- The final quoted amount.

## Action Buttons

### When Awaiting Response (Status: Sent)
Two prominent action buttons appear:

- **Approve** -- Clicking this immediately updates the quote status to Approved. A success confirmation appears on the page, and you receive a notification in JobStream.
- **Decline** -- Clicking this opens a text area where the customer can optionally explain why they are declining. After entering a reason (or leaving it blank), they click **Submit Decline** to confirm. The quote status updates to Declined.

### After Action Taken
Once the customer has approved or declined, the action buttons are replaced with a confirmation message showing what action was taken and when.

### Download PDF
A **Download PDF** button is available regardless of status, letting customers save a professional PDF copy of the quote.

### Expired Quotes
If the quote has passed its Valid Until date, the status shows as Expired and the Approve/Decline buttons are no longer available.

### Tips

- Follow up with customers whose quotes are still in "Awaiting Response" status after a few days.
- Review decline reasons in your notifications to understand why customers are not accepting quotes.
- The quote portal is fully mobile-responsive for customers reviewing on their phones.`,
  },
  {
    slug: "public-booking-form",
    category: "online-booking",
    title: "Public Booking Form",
    excerpt: "How the customer-facing booking form works and what customers experience.",
    lastUpdated: "2026-02-22",
    readingTime: 3,
    keywords: ["public booking", "booking form", "book", "customer booking", "service request", "time slots"],
    content: `## Public Booking Form Overview

The public booking form is a standalone page at \`/book/{your-org-slug}\` where anyone can request a service booking from your business. No login or account is required.

## Customer Experience

The booking form presents a clean, step-by-step layout:

### 1. Select Service
A dropdown lists all services you have enabled for online booking (configured in Settings > Booking Widget). Each service shows its name and price.

### 2. Choose Date
A date input lets the customer pick their preferred date. The form uses a standard date picker.

### 3. Choose Time Slot
After selecting a date, available time slots appear based on your business hours for that day of the week:

- If the day is open, slots are generated from your start time to your end time at intervals matching your configured slot duration.
- If the day is closed (e.g., Sunday), no time slots appear and a message indicates no availability.
- Slot duration options (set in Settings > Booking Widget) control the spacing: 15, 30, 45, 60, 90, or 120 minutes.

### 4. Contact Information
The customer enters:
- **First Name** (required)
- **Last Name** (required)
- **Email** (required)
- **Phone** (required)

### 5. Additional Notes
An optional text area where the customer can describe their needs, provide access instructions, or add any other relevant details.

### 6. Submit
The customer clicks **Request Booking** to submit. A success confirmation page appears letting them know the request has been received and your team will follow up.

## What Happens After Submission

1. A new booking record is created in your **Bookings** section with a "Pending" status.
2. The booking captures: customer name, email, phone, selected service, requested date, time, and notes.
3. If the customer is new (email not already in your system), their information is stored with the booking for you to create a customer record.
4. You receive a notification via the notification bell in the top bar.

## Inactive State

If online booking is disabled in Settings > Booking Widget, the booking page displays a message that online booking is not currently available.

### Tips

- Test your booking form by visiting \`/book/{your-slug}\` to see exactly what customers experience.
- Make sure your business hours are set correctly since they directly control available time slots.
- Share the booking URL prominently on your website and marketing materials.`,
  },
  // ============================================
  // NOTIFICATION BELL
  // ============================================
  {
    slug: "notification-bell",
    category: "account-settings",
    title: "Notification Bell",
    excerpt: "Stay informed with real-time in-app notifications and the notification bell.",
    lastUpdated: "2026-02-22",
    readingTime: 2,
    keywords: ["notifications", "bell", "alerts", "unread", "mark as read", "real-time"],
    content: `## What Is the Notification Bell?

The notification bell is an icon in the top bar of JobStream that shows you real-time notifications about important events in your business. A red badge displays the number of unread notifications.

## How It Works

The notification bell automatically polls for new notifications every 30 seconds. When new notifications arrive, the unread count badge updates without requiring a page refresh.

## Viewing Notifications

1. Click the **bell icon** in the top bar.
2. A dropdown opens showing your 10 most recent notifications.
3. Each notification displays:
   - **Title** -- A brief description of the event (e.g., "New Booking Request," "Invoice Paid").
   - **Message** -- Additional detail about the event.
   - **Time** -- How long ago the notification was created (e.g., "5 min ago," "2h ago").
   - **Read/Unread indicator** -- Unread notifications are visually highlighted.

## Taking Action on Notifications

- **Click a notification** -- If the notification is linked to a specific page (job, invoice, quote, booking), clicking it navigates you to that page and marks the notification as read.
- **Mark as read** -- Click the dot icon on an individual notification to mark it as read without navigating.
- **Mark all as read** -- Click the **Mark all as read** button at the top of the dropdown to clear all unread notifications at once.

## Types of Notifications

Notifications are generated for key business events including:

- New booking requests received.
- Quote approved or declined by a customer.
- Invoice payment received.
- Job status changes.
- New customer messages or replies.

## Empty State

When you have no notifications, the dropdown displays a "No notifications" message.

### Tips

- Check the notification bell multiple times per day to stay on top of customer activity.
- Use "Mark all as read" at the end of each day to start fresh the next morning.
- Clicking a notification is the fastest way to navigate directly to the relevant page.`,
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

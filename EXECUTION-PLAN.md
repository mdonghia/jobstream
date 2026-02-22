# JobStream: Complete Execution Plan

## Goal
Eliminate ALL stubs, placeholders, and non-functional features. Build all requested features. Make the app 100% client-ready. Update help center after every change.

---

## Stream A: Schema Migration + 4 Settings Pages

### A.0 -- Prisma Schema Migration
- Add to Organization model: bookingEnabled, bookingServices, bookingSlotDuration, reviewGoogleUrl, reviewYelpUrl, reviewFacebookUrl, reviewAutoRequest, reviewRequestDelay, paymentOnlineEnabled, commSmsEnabled, commEmailEnabled
- Run `npx prisma migrate dev`

### A.1 -- Settings > Payments (currently placeholder)
- Stripe Connect onboarding status display
- Connect/Disconnect Stripe account buttons
- Toggle online payments on/off
- Display accepted payment methods
- Files: settings/payments/page.tsx, components/settings/payment-settings-form.tsx, actions/settings.ts

### A.2 -- Settings > Communications (currently placeholder)
- Toggle SMS/Email channels on/off
- CRUD for AutomationRule model (already exists in schema)
- Template editor with variable placeholders ({{customerName}}, {{jobNumber}}, etc.)
- Trigger selection: JOB_SCHEDULED, JOB_COMPLETED, INVOICE_SENT, INVOICE_OVERDUE, QUOTE_SENT, BOOKING_RECEIVED, BOOKING_CONFIRMED
- Files: settings/communications/page.tsx, components/settings/communications-settings-form.tsx, actions/settings.ts

### A.3 -- Settings > Booking Widget (currently placeholder)
- Toggle public booking on/off
- Select which services are bookable
- Set slot duration (15/30/45/60/90/120 min)
- Show booking URL and embed code
- Files: settings/booking/page.tsx, components/settings/booking-settings-form.tsx, actions/settings.ts

### A.4 -- Settings > Reviews (currently placeholder)
- Configure Google/Yelp/Facebook review links
- Toggle auto-request reviews after job completion
- Set delay (hours after completion)
- Preview review request email
- Files: settings/reviews/page.tsx, components/settings/review-settings-form.tsx, actions/settings.ts

---

## Stream B: Client Portal (public-facing pages)

### B.1 -- Portal Layout
- Public layout at /portal/[slug]/layout.tsx
- Org branding (logo, name), clean white design
- No auth required

### B.2 -- Invoice Portal View + Online Payment
- /portal/[slug]/invoices/[token] -- View invoice, pay online
- Uses existing getInvoiceByToken() backend
- "Pay Now" button creates Stripe Checkout session
- Shows payment history, status badges

### B.3 -- Quote Portal View + Approve/Decline
- /portal/[slug]/quotes/[token] -- View quote, approve or decline
- Uses existing getQuoteByToken(), approveQuote(), declineQuote()
- Decline includes optional reason textarea

### B.4 -- Public Booking Form
- /book/[slug] -- Public booking request form
- Uses existing createPublicBooking() backend
- Service selection, date/time picker, contact info
- Respects bookingEnabled and bookingServices settings

---

## Stream C: PDF Generation

### C.1 -- Invoice PDF + Quote PDF templates
- Using @react-pdf/renderer (already installed)
- Professional layout: org branding, line items table, totals
- Files: lib/pdf/invoice-pdf.tsx, lib/pdf/quote-pdf.tsx

### C.2 -- PDF API Routes
- /api/pdf/invoice/[id] -- Authenticated download
- /api/pdf/quote/[id] -- Authenticated download
- /api/pdf/portal/invoice/[token] -- Public download (portal)
- /api/pdf/portal/quote/[token] -- Public download (portal)

### C.3 -- Download Buttons
- Add "Download PDF" to invoice detail page
- Add "Download PDF" to quote detail page
- Add "Download PDF" to portal views

---

## Stream D: Dashboard + Notifications + Calendar

### D.1 -- Notification Bell (currently dead button)
- Replace placeholder bell with working dropdown
- Fetch notifications on mount + poll every 30s
- Red badge with unread count
- Mark individual/all as read
- Click notification navigates to linkUrl
- Backend already exists: getNotifications(), markNotificationRead(), markAllNotificationsRead()

### D.2 -- Dashboard: Today's Schedule Widget
- New server action: getTodaysSchedule()
- Timeline view of today's jobs with time, customer, team member
- Links to job detail

### D.3 -- Dashboard: Action Required Widget
- New server action: getActionRequired()
- Overdue invoices, pending quotes, pending bookings
- Each links to the relevant detail page

### D.4 -- Calendar: Add Job to Calendar
- Make it clear how to add jobs to the calendar
- "Add Job" button on calendar view that links to /jobs/new with pre-filled date
- Improve unscheduled jobs sidebar visibility

---

## Stream E: Fix ALL Remaining Stubs

### E.1 -- Payments Export (toast stub -> CSV download)
- File: components/payments/payments-page.tsx line 204
- Generate CSV with papaparse, trigger download

### E.2 -- Time Tracking Export (toast stub -> CSV download)
- File: components/time-tracking/time-tracking-page.tsx
- Same CSV pattern

### E.3 -- Live Timer (local state -> server-side)
- Wire to existing startTimer(), stopTimer(), getActiveTimer() server actions
- Timer persists across page refreshes

### E.4 -- Job Edit Page (currently 404)
- Create /jobs/[id]/edit/page.tsx
- Add updateJob() server action
- Reuse JobBuilder component in edit mode

### E.5 -- File Upload (visual-only -> working)
- Wire dropzone in job-detail.tsx
- S3 upload if configured, local fallback
- Add uploadJobAttachment() server action

### E.6 -- Fix getUnscheduledJobs() (broken query)
- Change `scheduledStart <= new Date(0)` to actually find unscheduled jobs

### E.7 -- Send Reminder (uses wrong copy)
- Create dedicated sendInvoiceReminder() action with reminder-specific email template
- Wire "Send Reminder" button to use it

### E.8 -- Dev console.log status fix
- Change SENT -> QUEUED when env vars not configured
- Affects communications.ts SMS and email blocks

### E.9 -- Recurring Jobs (flag only -> generates instances)
- Add generateRecurringInstances() server action
- Parse recurrence rules, create child jobs
- Show "Generate Instances" button on recurring job detail

### E.10 -- Job Checklist (verify functionality)
- Audit checklist creation in job builder
- Audit checklist completion in job detail
- Fix any broken functionality

### E.11 -- Full Feature Audit
- Systematically test EVERY button, link, and form on EVERY page
- Fix anything that doesn't work

---

## Stream F: Stripe Integration

### F.1 -- Stripe Connect Onboarding API
- /api/stripe/connect -- Creates account + redirects to Stripe
- /api/stripe/connect/callback -- Handles return, updates org

### F.2 -- Stripe Checkout for Invoice Payment
- /api/stripe/checkout -- Creates checkout session
- Portal "Pay Now" button calls this

### F.3 -- Stripe Webhook
- /api/stripe/webhook -- Handles checkout.session.completed
- Records payment, updates invoice status

---

## Stream G: Help Center Updates

### G.1 -- Update ALL help articles after EVERY change
- File: src/lib/help-articles.ts
- Must reflect every new feature, changed button, new page
- Add new articles for: Client Portal, Online Payments, PDF Downloads, Booking Widget, Review Requests, Automation Rules

---

## What I Need From Mike Before Leaving

1. **Stripe**: Are you OK with test mode keys for now? (Can use Stripe test mode without real keys -- I'll build it to work with test keys, and you just swap in real keys later)
2. **Twilio/SendGrid**: Same question -- OK to build with dev fallback that logs to console, and you add real keys later?
3. **AWS S3**: OK to use local file storage fallback for now?

If yes to all three, I need NOTHING from you. I'll build everything to work with test/dev mode and you just add real API keys to .env when ready.

---

## Execution Order

1. Schema migration (must be first)
2. In parallel: Settings pages + Notification bell + Export fixes + Timer fix
3. In parallel: Client Portal + PDF Generation + Dashboard widgets + Calendar improvements
4. Stripe integration (depends on settings page)
5. Remaining stub fixes (job edit, file upload, recurring, etc.)
6. Full feature audit + help center updates
7. Run all Playwright tests
8. Commit and deploy

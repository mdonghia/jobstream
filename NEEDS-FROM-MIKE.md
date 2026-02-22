# Things Needed From Mike

Items below require your input or action before they can be completed. Nothing here is blocking current development -- all features are built and functional in dev/test mode.

---

## 1. Stripe API Keys (REQUIRED for live payments)

The Stripe integration is fully built and functional, but uses test mode. To enable real payments:

- **STRIPE_SECRET_KEY**: Your Stripe secret key (starts with `sk_live_...`)
- **STRIPE_PUBLISHABLE_KEY**: Your Stripe publishable key (starts with `pk_live_...`)
- **STRIPE_WEBHOOK_SECRET**: Generated when you create a webhook endpoint in Stripe Dashboard
  - Webhook URL: `https://your-domain.com/api/stripe/webhook`
  - Events to listen for: `checkout.session.completed`

Add these to your `.env` file and to Vercel environment variables.

---

## 2. SendGrid API Key (REQUIRED for real email delivery)

Email sending is wired up and falls back to console.log in dev mode. To send real emails:

- **SENDGRID_API_KEY**: From your SendGrid account
- **SENDGRID_FROM_EMAIL**: Verified sender email address (e.g., `noreply@yourdomain.com`)

Currently, all email actions (invoice send, quote send, reminders, booking confirmations) log to console instead of sending. They will work immediately once these env vars are set.

---

## 3. Twilio Credentials (REQUIRED for real SMS delivery)

SMS sending is wired up with console.log fallback. To send real SMS:

- **TWILIO_ACCOUNT_SID**: Your Twilio Account SID
- **TWILIO_AUTH_TOKEN**: Your Twilio Auth Token
- **TWILIO_PHONE_NUMBER**: Your Twilio phone number (e.g., `+15551234567`)

---

## 4. AWS S3 Bucket (OPTIONAL - for cloud file storage)

File uploads currently save to `public/uploads/` on the server filesystem. This works for development but files won't persist across Vercel deployments. To use S3:

- **AWS_ACCESS_KEY_ID**: IAM user access key
- **AWS_SECRET_ACCESS_KEY**: IAM user secret key
- **AWS_S3_BUCKET**: Bucket name
- **AWS_S3_REGION**: Bucket region (e.g., `us-east-1`)

Without S3, file uploads still work locally but won't persist on Vercel's serverless environment.

---

## 5. Custom Domain (OPTIONAL)

The portal and booking URLs use the app's domain. Once you have a custom domain:

- Update `NEXT_PUBLIC_APP_URL` in `.env`
- Portal links in emails will use the custom domain
- Booking widget URLs will use the custom domain

---

## 6. Review Before Go-Live

Before handing off to your client, review these:

- [ ] Test the full invoice -> payment flow with Stripe test keys
- [ ] Test email delivery with SendGrid
- [ ] Verify the booking form works at `/book/{org-slug}`
- [ ] Check that PDF downloads look correct for invoices and quotes
- [ ] Review the Help Center articles for accuracy
- [ ] Run the Playwright test suite: `npx playwright test`

---

*This document was generated automatically. Nothing above is blocking development -- all features are built and functional in test/dev mode.*

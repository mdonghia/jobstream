import { test, expect, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Production Review -- Comprehensive Page-by-Page Audit
// ---------------------------------------------------------------------------

const DEMO_EMAIL = "demo@jobstream.app";
const DEMO_PASSWORD = "password123";
const SCREENSHOT_DIR = path.resolve("screenshots/production-review");

/** All results accumulated across tests. */
const allResults: Record<string, Record<string, unknown>> = {};

function ensureDir() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function saveResult(name: string, data: Record<string, unknown>) {
  ensureDir();
  allResults[name] = data;
  // Write individual result file
  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, `${name}.json`),
    JSON.stringify(data, null, 2),
    "utf-8"
  );
  // Also write combined results
  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, "all-results.json"),
    JSON.stringify(allResults, null, 2),
    "utf-8"
  );
}

async function ss(page: Page, name: string): Promise<void> {
  ensureDir();
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: true,
  });
}

/**
 * Log in with demo credentials. Handles NextAuth redirect flow.
 * Returns true if login succeeded, false otherwise.
 */
async function loginAsDemo(page: Page): Promise<boolean> {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  // Fill credentials
  await page.getByLabel(/email/i).fill(DEMO_EMAIL);
  await page.getByLabel(/password/i).fill(DEMO_PASSWORD);

  // Click the submit button
  const submitButton = page.locator(
    'form button[type="submit"], button:has-text("Sign In"), button:has-text("Continue"), button:has-text("Log In")'
  ).first();
  await submitButton.click();

  // Wait for the URL to leave /login -- NextAuth may go through a callbackUrl
  // first, then redirect to /. We just need to wait until we're no longer on /login.
  try {
    // Wait up to 30s for the URL to change away from /login
    await page.waitForFunction(
      () => !window.location.pathname.includes("/login"),
      { timeout: 30000 }
    );
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    return true;
  } catch {
    // Still on login page -- check for errors
    const bodyText = await page.textContent("body").catch(() => "");
    console.log(`Login may have failed. URL: ${page.url()}`);
    // Check if we're actually on the dashboard despite URL issues
    if (!page.url().includes("/login")) {
      return true;
    }
    return false;
  }
}

// ============================================================================
// TEST SUITE
// ============================================================================
test.describe("Production Review", () => {
  test.setTimeout(120000);

  // -------------------------------------------------------------------------
  // 01 -- LOGIN PAGE (no auth needed)
  // -------------------------------------------------------------------------
  test("01 -- Login Page", async ({ page }) => {
    ensureDir();
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const data: Record<string, unknown> = {};

    // Full page text
    const bodyText = await page.textContent("body").catch(() => "");
    data.fullPageText = bodyText?.substring(0, 3000);

    // Branding
    data.hasJobStreamBranding = (bodyText ?? "").includes("JobStream");

    // Heading -- check actual text
    const headingEl = page.locator("h1, h2, h3").first();
    data.headingText = await headingEl.textContent().catch(() => null);
    data.hasWelcomeBackHeading = (data.headingText as string)?.includes("Welcome back") ?? false;
    data.hasSignInHeading = (data.headingText as string)?.includes("Sign in") ?? false;

    // Form fields
    data.hasEmailField = await page.getByLabel(/email/i).isVisible().catch(() => false);
    data.hasPasswordField = await page.getByLabel(/password/i).isVisible().catch(() => false);

    // Button
    const buttonEl = page.locator('form button[type="submit"], button:has-text("Sign In"), button:has-text("Continue")').first();
    data.buttonText = await buttonEl.textContent().catch(() => null);
    data.hasSubmitButton = await buttonEl.isVisible().catch(() => false);

    // Links
    data.hasSignUpLink = (bodyText ?? "").includes("Sign up");
    data.hasForgotPasswordLink = (bodyText ?? "").toLowerCase().includes("forgot");
    data.hasBackToHome = (bodyText ?? "").includes("Back to Home");

    await ss(page, "01-login-page");
    saveResult("01-login-page", data);
  });

  // -------------------------------------------------------------------------
  // 02 -- LOGIN ATTEMPT (verify demo credentials work)
  // -------------------------------------------------------------------------
  test("02 -- Login Attempt", async ({ page }) => {
    const data: Record<string, unknown> = {};

    // Attempt login
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    await page.getByLabel(/email/i).fill(DEMO_EMAIL);
    await page.getByLabel(/password/i).fill(DEMO_PASSWORD);

    // Take screenshot before clicking
    await ss(page, "02a-login-filled");

    // Click submit
    const submitButton = page.locator(
      'form button[type="submit"], button:has-text("Sign In"), button:has-text("Continue"), button:has-text("Log In")'
    ).first();
    await submitButton.click();

    // Wait for navigation away from /login or for an error to appear
    try {
      await page.waitForFunction(
        () => !window.location.pathname.includes("/login"),
        { timeout: 20000 }
      );
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    } catch {
      // Still on login -- might be an error
    }

    // Take screenshot after clicking
    await ss(page, "02b-login-after-submit");

    // Check what happened
    data.currentUrl = page.url();
    data.isOnDashboard = !page.url().includes("/login");
    data.loginSucceeded = data.isOnDashboard;

    if (data.isOnDashboard) {
      // Full page text from dashboard
      const bodyText = await page.textContent("body").catch(() => "");
      data.fullPageText = bodyText?.substring(0, 3000);
      data.dashboardHeading = await page.getByRole("main").getByRole("heading", { level: 1 }).textContent().catch(() => null);
    } else {
      // Check for error messages
      const bodyText = await page.textContent("body").catch(() => "");
      data.fullPageText = bodyText?.substring(0, 3000);
      const errorEl = page.locator(".bg-red-50, .text-red-700").first();
      data.hasError = await errorEl.isVisible().catch(() => false);
      if (data.hasError) {
        data.errorText = await errorEl.textContent().catch(() => null);
      }
    }

    saveResult("02-login-attempt", data);
  });

  // -------------------------------------------------------------------------
  // 03+ -- ALL AUTHENTICATED PAGES (only runs if login works)
  // -------------------------------------------------------------------------
  test("03 -- Dashboard + All Pages", async ({ page }) => {
    const loginOk = await loginAsDemo(page);

    const masterData: Record<string, Record<string, unknown>> = {};

    if (!loginOk) {
      // Login failed -- take screenshot and document
      await ss(page, "03-login-failed");
      saveResult("03-login-failed", {
        loginSucceeded: false,
        currentUrl: page.url(),
        bodyText: (await page.textContent("body").catch(() => ""))?.substring(0, 2000),
      });
      // Skip all further tests -- but still run
      test.skip();
      return;
    }

    // ===== DASHBOARD =====
    {
      await page.waitForTimeout(2000);
      const d: Record<string, unknown> = {};

      const mainText = await page.getByRole("main").textContent().catch(() => "");
      d.mainHeading = await page.getByRole("main").getByRole("heading", { level: 1 }).textContent().catch(() => null);
      d.mainTextContent = mainText?.substring(0, 6000);

      d.hasUnscheduledJobs = mainText?.includes("Unscheduled Jobs") ?? false;
      d.hasNeedsInvoicing = mainText?.includes("Needs Invoicing") ?? false;
      d.hasOverdueQuotes = mainText?.includes("Overdue Quotes") ?? false;
      d.hasOverdueInvoices = mainText?.includes("Overdue Invoices") ?? false;
      d.hasTodaysProgress = mainText?.includes("Today's Progress") ?? false;
      d.hasVisitsComplete = mainText?.toLowerCase().includes("visits complete") ?? false;
      d.hasRevenueCard = mainText?.includes("Revenue") ?? false;
      d.hasVisitsCompletedCard = mainText?.includes("Visits Completed") ?? false;
      d.hasToday = mainText?.includes("Today") ?? false;
      d.hasThisWeek = mainText?.includes("This Week") ?? false;
      d.hasThisMonth = mainText?.includes("This Month") ?? false;

      const dollarMatches = mainText?.match(/\$[\d,.]+/g);
      d.dollarAmounts = dollarMatches || [];

      await ss(page, "03-dashboard");
      saveResult("03-dashboard", d);
    }

    // ===== SIDEBAR =====
    {
      const d: Record<string, unknown> = {};
      const sidebarText = await page.locator("aside").first().textContent().catch(() => "");
      d.sidebarText = sidebarText;

      for (const item of ["Dashboard", "Jobs", "Customers", "Schedule", "Invoices", "Reports", "Reviews", "Settings"]) {
        d[`has_${item}`] = sidebarText?.includes(item) ?? false;
      }
      for (const item of ["Quotes", "Payments", "Bookings", "Time Tracking", "Communications"]) {
        d[`missing_${item}`] = !(sidebarText?.includes(item) ?? false);
      }

      await ss(page, "04-sidebar");
      saveResult("04-sidebar", d);
    }

    // ===== JOBS PAGE -- ALL 6 TABS =====
    const jobTabs = ["Unscheduled", "Scheduled", "Quoted", "Needs Invoicing", "Awaiting Payment", "Closed"];

    for (let i = 0; i < jobTabs.length; i++) {
      const tabName = jobTabs[i];
      const num = String(i + 5).padStart(2, "0");
      const d: Record<string, unknown> = {};

      await page.goto("/jobs");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1500);

      const tab = page.getByRole("tab", { name: new RegExp(tabName, "i") });
      d.tabExists = await tab.isVisible().catch(() => false);

      if (d.tabExists) {
        await tab.click();
        await page.waitForTimeout(1500);

        const tabText = await tab.textContent();
        d.tabFullText = tabText?.trim();
        const cm = tabText?.match(/(\d+)/);
        d.tabCount = cm ? parseInt(cm[1]) : null;

        // Column headers
        const headers: string[] = [];
        const ths = page.locator("thead th");
        const thCount = await ths.count().catch(() => 0);
        for (let j = 0; j < thCount; j++) {
          const t = await ths.nth(j).textContent();
          if (t?.trim()) headers.push(t.trim());
        }
        d.columnHeaders = headers;
        d.rowCount = await page.locator("tbody tr").count().catch(() => 0);
        d.hasEmptyState = (await page.getByText(/no .* found|no results/i).isVisible().catch(() => false));
      } else {
        const allTabs = page.getByRole("tab");
        const texts: string[] = [];
        const tc = await allTabs.count().catch(() => 0);
        for (let j = 0; j < tc; j++) {
          const t = await allTabs.nth(j).textContent();
          if (t?.trim()) texts.push(t.trim());
        }
        d.availableTabs = texts;
      }

      const ssName = `${num}-jobs-${tabName.toLowerCase().replace(/\s+/g, "-")}`;
      await ss(page, ssName);
      saveResult(ssName, d);
    }

    // ===== NEW JOB FORM =====
    {
      const d: Record<string, unknown> = {};
      await page.goto("/jobs/new");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const mainText = await page.getByRole("main").textContent().catch(() => "");
      d.pageTextSnippet = mainText?.substring(0, 4000);

      d.hasNewJobHeading = await page.getByRole("heading", { name: /new job/i }).isVisible().catch(() => false);
      d.hasCustomerPicker = mainText?.includes("Customer") ?? false;
      d.hasCombobox = await page.getByRole("combobox").first().isVisible().catch(() => false);
      d.hasJobTitle = mainText?.includes("Title") ?? false;
      d.hasDescription = mainText?.includes("Description") ?? false;
      d.hasPriority = mainText?.includes("Priority") ?? false;
      d.hasServicesLineItems = mainText?.includes("Services") ?? false;
      d.hasSchedule = mainText?.includes("Schedule") ?? false;
      d.hasTeamMembers = mainText?.includes("Team") ?? false;
      d.hasRecurringToggle = mainText?.includes("Recurring") ?? false;
      d.hasChecklists = mainText?.includes("Checklist") ?? false;
      d.hasInternalNotes = mainText?.includes("Internal Notes") ?? false;
      d.hasJobSummary = mainText?.includes("Job Summary") ?? false;
      d.hasCreateJobButton = await page.getByRole("button", { name: /create job/i }).isVisible().catch(() => false);

      await ss(page, "12-new-job-form");
      saveResult("12-new-job-form", d);
    }

    // ===== JOB DETAIL =====
    {
      const d: Record<string, unknown> = {};
      await page.goto("/jobs");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1500);

      const firstJobLink = page.locator("table a.font-mono").first();
      d.hasJobsInList = (await firstJobLink.count()) > 0;

      if (d.hasJobsInList) {
        d.firstJobNumber = (await firstJobLink.textContent())?.trim();
        await firstJobLink.click();
        await page.waitForTimeout(2000);

        const mainText = await page.getByRole("main").textContent().catch(() => "");
        d.pageTextSnippet = mainText?.substring(0, 4000);

        d.jobNumberFormatValid = /JOB-\d+/.test(mainText ?? "");
        d.hasCustomerSection = mainText?.includes("Customer") ?? false;
        d.hasStatusBadge = await page.locator("span.inline-flex.items-center.rounded-full").first().isVisible().catch(() => false);
        d.hasVisitsSection = mainText?.includes("Visits") ?? false;
        d.hasInvoicesSection = mainText?.includes("Invoices") ?? false;
        d.hasActivityFeed = mainText?.includes("Activity") ?? false;
        d.hasInternalNotes = mainText?.includes("Internal Notes") ?? false;

        await ss(page, "13-job-detail");
      } else {
        await ss(page, "13-job-detail-empty");
      }
      saveResult("13-job-detail", d);
    }

    // ===== CUSTOMERS LIST =====
    {
      const d: Record<string, unknown> = {};
      await page.goto("/customers");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const mainText = await page.getByRole("main").textContent().catch(() => "");
      d.pageTextSnippet = mainText?.substring(0, 3000);
      d.hasHeading = mainText?.includes("Customers") ?? false;
      d.customerCountText = (await page.getByText(/\d+ total/i).first().textContent().catch(() => null))?.trim();
      d.hasAddCustomerButton = await page.getByRole("link", { name: /add customer|new customer/i }).isVisible().catch(() => false);
      d.hasSearchBar = await page.locator('input[placeholder*="Search"], input[placeholder*="search"]').isVisible().catch(() => false);

      const headers: string[] = [];
      const ths = page.locator("thead th");
      const thCount = await ths.count().catch(() => 0);
      for (let j = 0; j < thCount; j++) {
        const t = await ths.nth(j).textContent();
        if (t?.trim()) headers.push(t.trim());
      }
      d.columnHeaders = headers;
      d.rowCount = await page.locator("tbody tr").count().catch(() => 0);

      await ss(page, "14-customers-list");
      saveResult("14-customers-list", d);
    }

    // ===== CUSTOMER DETAIL =====
    {
      const d: Record<string, unknown> = {};
      await page.goto("/customers");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1500);

      const firstLink = page.locator("tbody tr td a, tbody tr a").first();
      d.hasCustomersInList = (await firstLink.count()) > 0;

      if (d.hasCustomersInList) {
        await firstLink.click();
        await page.waitForTimeout(2000);

        const mainText = await page.getByRole("main").textContent().catch(() => "");
        d.pageTextSnippet = mainText?.substring(0, 4000);
        d.customerName = (await page.getByRole("main").getByRole("heading", { level: 1 }).textContent().catch(() => null))?.trim();
        d.hasEditButton = await page.getByRole("button", { name: /edit/i }).isVisible().catch(() => false);

        // Tabs
        const tabTexts: string[] = [];
        const tabs = page.getByRole("tab");
        const tc = await tabs.count().catch(() => 0);
        for (let j = 0; j < tc; j++) {
          const t = await tabs.nth(j).textContent();
          if (t?.trim()) tabTexts.push(t.trim());
        }
        d.tabNames = tabTexts;

        d.hasContactInfo = mainText?.includes("Contact") ?? false;
        d.hasNaNBug = mainText?.includes("$NaN") ?? false;
        d.hasNaN = mainText?.includes("NaN") ?? false;
        d.hasProperties = (mainText?.toLowerCase().includes("propert")) ?? false;
        d.hasStatistics = (mainText?.toLowerCase().includes("statistic")) ?? false;

        await ss(page, "15-customer-detail");
      }
      saveResult("15-customer-detail", d);
    }

    // ===== SCHEDULE PAGE =====
    {
      const d: Record<string, unknown> = {};
      await page.goto("/schedule");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const mainText = await page.getByRole("main").textContent().catch(() => "");
      d.pageTextSnippet = mainText?.substring(0, 2000);
      d.hasHeading = await page.getByRole("heading", { name: /schedule/i }).isVisible().catch(() => false);
      d.hasDayViewButton = await page.getByRole("button", { name: /day/i }).isVisible().catch(() => false);
      d.hasListViewButton = await page.getByRole("button", { name: /list/i }).isVisible().catch(() => false);
      d.hasUnscheduledSidebar = (mainText?.toLowerCase().includes("unscheduled")) ?? false;
      d.hasDateNavigation = await page.getByRole("button", { name: /today/i }).isVisible().catch(() => false);

      await ss(page, "16-schedule-day");

      const listBtn = page.getByRole("button", { name: /list/i });
      if (await listBtn.isVisible().catch(() => false)) {
        await listBtn.click();
        await page.waitForTimeout(1500);
        await ss(page, "16b-schedule-list");
      }
      saveResult("16-schedule", d);
    }

    // ===== INVOICES -- ALL 6 TABS =====
    const invoiceTabs = ["Draft", "Sent", "Overdue", "Partially Paid", "Paid", "Cancelled"];
    // First navigate to invoices to see what tabs actually exist
    {
      await page.goto("/invoices");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Get all available tabs
      const allTabs = page.getByRole("tab");
      const allTabTexts: string[] = [];
      const tc = await allTabs.count().catch(() => 0);
      for (let j = 0; j < tc; j++) {
        const t = await allTabs.nth(j).textContent();
        if (t?.trim()) allTabTexts.push(t.trim());
      }
      saveResult("17-invoices-available-tabs", { availableTabs: allTabTexts });
    }

    for (let i = 0; i < invoiceTabs.length; i++) {
      const tabName = invoiceTabs[i];
      const num = String(i + 17).padStart(2, "0");
      const d: Record<string, unknown> = {};

      await page.goto("/invoices");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1500);

      d.hasHeading = await page.getByRole("heading", { name: /invoices/i }).isVisible().catch(() => false);

      // Try exact match first, then broader
      let tab = page.getByRole("tab", { name: new RegExp(`^${tabName}`, "i") });
      let tabExists = await tab.isVisible().catch(() => false);

      if (!tabExists) {
        // Try broader match
        tab = page.getByRole("tab", { name: new RegExp(tabName, "i") });
        tabExists = await tab.isVisible().catch(() => false);
      }

      // For "Cancelled", also try "Void"
      if (!tabExists && tabName === "Cancelled") {
        tab = page.getByRole("tab", { name: /void/i });
        tabExists = await tab.isVisible().catch(() => false);
        if (tabExists) d.actualTabName = "Void";
      }

      d.tabExists = tabExists;

      if (tabExists) {
        await tab.click();
        await page.waitForTimeout(1500);

        const tabText = await tab.textContent();
        d.tabFullText = tabText?.trim();
        const cm = tabText?.match(/(\d+)/);
        d.tabCount = cm ? parseInt(cm[1]) : null;
        d.rowCount = await page.locator("tbody tr").count().catch(() => 0);

        const headers: string[] = [];
        const ths = page.locator("thead th");
        const thCount = await ths.count().catch(() => 0);
        for (let j = 0; j < thCount; j++) {
          const t = await ths.nth(j).textContent();
          if (t?.trim()) headers.push(t.trim());
        }
        d.columnHeaders = headers;
      }

      const ssName = `${num}-invoices-${tabName.toLowerCase().replace(/\s+/g, "-")}`;
      await ss(page, ssName);
      saveResult(ssName, d);
    }

    // ===== REPORTS =====
    {
      const d: Record<string, unknown> = {};
      await page.goto("/reports");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      const mainText = await page.getByRole("main").textContent().catch(() => "");
      d.pageTextSnippet = mainText?.substring(0, 3000);
      d.hasHeading = await page.getByRole("heading", { name: /reports/i }).isVisible().catch(() => false);

      for (const tab of ["Revenue", "Jobs", "Quotes", "Team", "Customers"]) {
        d[`hasTab_${tab}`] = await page.getByRole("tab", { name: new RegExp(tab, "i") }).isVisible().catch(() => false);
      }

      d.dollarAmounts = mainText?.match(/\$[\d,.]+/g) || [];

      await ss(page, "23-reports");
      saveResult("23-reports", d);
    }

    // ===== SETTINGS > GENERAL =====
    {
      const d: Record<string, unknown> = {};
      await page.goto("/settings/general");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const mainText = await page.getByRole("main").textContent().catch(() => "");
      d.pageTextSnippet = mainText?.substring(0, 3000);
      d.hasBusinessDetails = (mainText?.toLowerCase().includes("business")) ?? false;
      d.hasAddress = (mainText?.toLowerCase().includes("address")) ?? false;
      d.hasOperational = (mainText?.includes("Time Zone") || mainText?.includes("Currency")) ?? false;
      d.hasDocument = (mainText?.includes("Prefix") || mainText?.includes("Document")) ?? false;
      d.hasBusinessHours = (mainText?.includes("Business Hours") || mainText?.includes("Working Hours")) ?? false;

      await ss(page, "24-settings-general");
      saveResult("24-settings-general", d);
    }

    // ===== SETTINGS > COMMUNICATIONS =====
    {
      const d: Record<string, unknown> = {};
      await page.goto("/settings/communications");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const mainText = await page.getByRole("main").textContent().catch(() => "");
      d.pageTextSnippet = mainText?.substring(0, 4000);
      d.hasHeading = await page.getByRole("heading", { name: /notification|communication/i }).isVisible().catch(() => false);
      d.hasCustomerNotifications = (mainText?.includes("Customer Notifications")) ?? false;
      d.hasAdminNotifications = (mainText?.includes("Admin Notifications")) ?? false;
      d.hasTechNotifications = (mainText?.includes("Tech") && mainText?.includes("Notifications")) ?? false;
      d.switchCount = await page.locator('[role="switch"]').count().catch(() => 0);

      const notifTypes = ["Quote Sent", "Quote Approved", "Job Scheduled", "Job Started", "Job Completed", "Invoice Sent", "Payment Received", "Appointment Reminder", "New Job Assigned", "Job Cancelled", "Job Assigned"];
      d.foundNotificationTypes = notifTypes.filter(t => mainText?.includes(t));

      await ss(page, "25-settings-communications");
      saveResult("25-settings-communications", d);
    }

    // ===== REVIEWS PAGE =====
    {
      const d: Record<string, unknown> = {};
      await page.goto("/reviews");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const mainText = await page.getByRole("main").textContent().catch(() => "");
      d.pageTextSnippet = mainText?.substring(0, 2000);
      d.hasHeading = await page.getByRole("heading", { name: /reviews/i }).first().isVisible().catch(() => false);

      await ss(page, "26-reviews");
      saveResult("26-reviews", d);
    }

    // ===== LOGOUT FLOW =====
    {
      const d: Record<string, unknown> = {};

      // Click user menu
      const headerButtons = page.locator("header button");
      const btnCount = await headerButtons.count();
      await headerButtons.nth(btnCount - 1).click();
      await page.waitForTimeout(500);

      d.hasDropdownMenu = await page.locator('[role="menu"]').isVisible().catch(() => false);

      const logoutItem = page.getByRole("menuitem", { name: /log out|sign out/i });
      d.hasLogOutOption = await logoutItem.isVisible().catch(() => false);

      const dropdownText = await page.locator('[role="menu"]').textContent().catch(() => "");
      d.dropdownText = dropdownText?.substring(0, 500);

      await ss(page, "27-user-menu");

      if (d.hasLogOutOption) {
        await logoutItem.click();
        await page.waitForTimeout(3000);
        d.redirectedToLogin = page.url().includes("/login");
        d.finalUrl = page.url();
        await ss(page, "27b-after-logout");
      }

      saveResult("27-logout", d);
    }
  });
});

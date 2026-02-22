import { test, expect, type Page, type BrowserContext } from "@playwright/test";

// ---------------------------------------------------------------------------
// Onboarding Flow Test
// ---------------------------------------------------------------------------
// Tests the complete new-business setup experience: registration, first
// customer creation, first service setup, and first quote/job/invoice
// creation. Proves that a brand-new user can get through the entire
// first-time setup without hitting any errors.
//
// Uses a completely fresh registration (not the demo account) so we start
// from absolute zero and verify every "empty state" → "first item" flow.
// ---------------------------------------------------------------------------

const TS = Date.now();
const RAND = Math.floor(Math.random() * 10000);

const NEW_USER = {
  firstName: "Onboard",
  lastName: `Tester${RAND}`,
  email: `onboard-${TS}-${RAND}@example.com`,
  password: "OnboardPass123!",
  businessName: `Onboard Co ${RAND}`,
};

test.describe.serial("New Business Onboarding Flow", () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  // =========================================================================
  // Step 1: Register a brand-new business
  // =========================================================================

  test("Step 1 -- Register a new business account", async () => {
    await page.goto("/register");

    // Fill in the registration form
    await page.getByLabel(/first name/i).fill(NEW_USER.firstName);
    await page.getByLabel(/last name/i).fill(NEW_USER.lastName);
    await page.getByLabel(/email/i).fill(NEW_USER.email);
    await page.getByLabel(/password/i).fill(NEW_USER.password);
    await page.getByLabel(/business name/i).fill(NEW_USER.businessName);

    // Submit
    await page.getByRole("button", { name: /create account/i }).click();

    // Should land on the dashboard
    await expect(
      page.locator("header").getByRole("heading", { level: 1 })
    ).toHaveText("Dashboard", { timeout: 15000 });

    // The welcome heading should include the user's first name
    await expect(
      page
        .getByRole("main")
        .getByRole("heading", { name: new RegExp(`Welcome back, ${NEW_USER.firstName}`) })
    ).toBeVisible({ timeout: 5000 });
  });

  // =========================================================================
  // Step 2: Verify empty dashboard
  // =========================================================================

  test("Step 2 -- Dashboard shows zero state for new business", async () => {
    // Should already be on dashboard from registration
    await expect(
      page
        .getByRole("main")
        .getByRole("heading", { name: /welcome back/i, level: 1 })
    ).toBeVisible({ timeout: 10000 });

    // Revenue This Month should be $0 or $0.00
    const revenueCard = page.getByText("Revenue This Month").locator("..");
    await expect(revenueCard).toBeVisible({ timeout: 5000 });
    const revenueText = revenueCard.locator("p.text-2xl");
    await expect(revenueText).toBeVisible();
    const revenue = await revenueText.textContent();
    expect(revenue).toMatch(/\$0(\.00)?/);

    // Jobs Completed should be 0
    const jobsCard = page.getByText("Jobs Completed").locator("..");
    await expect(jobsCard).toBeVisible({ timeout: 5000 });
    const jobsText = jobsCard.locator("p.text-2xl");
    const jobs = await jobsText.textContent();
    expect(Number(jobs)).toBe(0);
  });

  // =========================================================================
  // Step 3: Create first customer (empty state flow)
  // =========================================================================

  test("Step 3 -- Create first customer from empty state", async () => {
    await page.goto("/customers");
    await expect(
      page.locator("header").getByRole("heading", { level: 1 })
    ).toHaveText("Customers", { timeout: 10000 });

    // Should show empty state since this is a brand new org
    // Click "Add Customer" button (may be in empty state or header)
    const addBtn = page.getByRole("button", { name: /add customer/i });
    await expect(addBtn.first()).toBeVisible({ timeout: 10000 });
    await addBtn.first().click();

    // Side sheet opens
    await expect(
      page.getByRole("heading", { name: "Add Customer" })
    ).toBeVisible({ timeout: 10000 });

    // Fill in customer details
    await page.locator("#firstName").fill("FirstClient");
    await page.locator("#lastName").fill(`Test${RAND}`);
    await page.locator("#email").fill(`firstclient-${RAND}@test.io`);
    await page.locator("#phone").fill("5551234567");

    // Save
    await page.getByRole("button", { name: /save customer/i }).click();
    await expect(page.getByText("Customer created")).toBeVisible({
      timeout: 10000,
    });

    // Customer should now appear in the list
    await expect(
      page.getByRole("link", { name: /FirstClient/ })
    ).toBeVisible({ timeout: 10000 });
  });

  // =========================================================================
  // Step 4: Set up first service in Settings
  // =========================================================================

  test("Step 4 -- Create first service in Settings", async () => {
    await page.goto("/settings/services");
    // The topbar shows "Services" (not "Settings") for this sub-page
    await expect(
      page.locator("header").getByRole("heading", { level: 1 })
    ).toHaveText("Services", { timeout: 10000 });

    // Click "Add Service" button
    const addServiceBtn = page.getByRole("button", { name: /add service/i });
    await expect(addServiceBtn.first()).toBeVisible({ timeout: 10000 });
    await addServiceBtn.first().click();

    // Dialog should open
    await expect(
      page.getByRole("heading", { name: /add service/i })
    ).toBeVisible({ timeout: 10000 });

    // Fill service details using the placeholder selectors
    await page.getByPlaceholder("e.g. Lawn Mowing").fill(`Premium Plumbing ${RAND}`);
    await page
      .getByPlaceholder("Type or select a category...")
      .fill("Plumbing");
    await page.getByPlaceholder("0.00").fill("175");

    // Submit
    await page.getByRole("button", { name: "Add Service" }).click();

    // Should see success toast
    await expect(
      page.locator("[data-sonner-toast]").first()
    ).toBeVisible({ timeout: 10000 });
  });

  // =========================================================================
  // Step 5: Create first quote
  // =========================================================================

  test("Step 5 -- Create first quote from empty state", async () => {
    await page.goto("/quotes");
    await expect(
      page.locator("main").locator("h1, h2").first()
    ).toBeVisible({ timeout: 15000 });

    // With no quotes yet, should show empty state. Find the New Quote link/button.
    const newQuoteLink = page.getByRole("link", { name: /new quote/i });
    const newQuoteButton = page.getByRole("button", {
      name: /new quote|create.*first.*quote/i,
    });

    if (await newQuoteLink.isVisible().catch(() => false)) {
      await newQuoteLink.click();
    } else {
      await newQuoteButton.first().click();
    }

    await expect(page).toHaveURL(/\/quotes\/new/, { timeout: 10000 });
    await expect(
      page.locator("main").locator("h1")
    ).toBeVisible({ timeout: 15000 });

    // Select the customer
    const combobox = page.getByRole("combobox").first();
    await combobox.click();
    await expect(page.locator("[cmdk-list]")).toBeVisible({ timeout: 10000 });
    await page.locator("[cmdk-item]").first().click();
    await page.waitForTimeout(500);

    // Fill in line item
    const nameInput = page.locator('input[placeholder="Item name"]').first();
    const currentName = await nameInput.inputValue();
    if (!currentName) {
      await nameInput.fill("Initial Assessment");
    }

    // Set price
    const priceInputs = page
      .locator("table tbody tr")
      .first()
      .locator('input[type="number"]');
    const priceInput = priceInputs.last();
    const currentPrice = await priceInput.inputValue();
    if (!currentPrice || currentPrice === "0") {
      await priceInput.fill("100");
    }

    // Save as draft
    await page.getByRole("button", { name: /save as draft/i }).click();
    await expect(page).toHaveURL(/\/quotes\/(?!new)[a-zA-Z0-9-]+$/, {
      timeout: 15000,
    });

    // Quote number should be visible
    await expect(page.locator("h1.font-mono")).toBeVisible({ timeout: 10000 });
  });

  // =========================================================================
  // Step 6: Create first job
  // =========================================================================

  test("Step 6 -- Create first job from empty state", async () => {
    await page.goto("/jobs/new");
    await expect(
      page.getByRole("main").getByRole("heading", { name: "New Job", level: 1 })
    ).toBeVisible({ timeout: 10000 });

    // Select customer
    const combobox = page.getByRole("combobox").first();
    await combobox.click();
    await expect(page.locator("[cmdk-list]")).toBeVisible({ timeout: 10000 });
    await page.locator("[cmdk-item]").first().click();
    await page.waitForTimeout(500);

    // Set title
    await page
      .locator('input[placeholder="e.g., Weekly lawn mowing"]')
      .fill(`First Job ${RAND}`);

    // Pick a date
    const dateButton = page.getByRole("button", { name: /pick a date/i });
    await dateButton.click();
    const popover = page.locator("[data-radix-popper-content-wrapper]");
    await expect(popover).toBeVisible({ timeout: 5000 });
    const dayButtons = popover.locator("td button:not([disabled])");
    const count = await dayButtons.count();
    if (count > 0) {
      await dayButtons.nth(Math.min(15, count - 1)).click();
    }
    await page.waitForTimeout(500);

    // Create job
    await page.getByRole("button", { name: /create job/i }).click();
    await expect(page).toHaveURL(/\/jobs\/(?!new)[a-zA-Z0-9-]+$/, {
      timeout: 15000,
    });

    // Job title should appear
    await expect(
      page.getByRole("heading", { name: `First Job ${RAND}` })
    ).toBeVisible({ timeout: 10000 });
  });

  // =========================================================================
  // Step 7: Create first invoice
  // =========================================================================

  test("Step 7 -- Create first invoice from empty state", async () => {
    await page.goto("/invoices/new");
    await expect(
      page.locator("main").locator("h1")
    ).toBeVisible({ timeout: 15000 });

    // Select customer
    const combobox = page.getByRole("combobox").first();
    await combobox.click();

    // Handle different combobox types
    const searchInput = page.getByPlaceholder(/search customers/i);
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      const option = page.locator('[role="option"]').first();
      await expect(option).toBeVisible({ timeout: 10000 });
      await option.click();
    } else {
      await expect(page.locator("[cmdk-list]")).toBeVisible({ timeout: 5000 });
      await page.locator("[cmdk-item]").first().click();
    }
    await page.waitForTimeout(500);

    // Fill line item
    const nameInput = page.getByPlaceholder("Line item name").first();
    await nameInput.fill("First Service Charge");

    const priceInput = page
      .locator('input[type="number"][step="0.01"][min="0"]')
      .first();
    await priceInput.fill("200");

    // Save as draft
    await page.getByRole("button", { name: /save as draft/i }).click();
    await expect(page).toHaveURL(/\/invoices\/(?!new)[a-zA-Z0-9-]+$/, {
      timeout: 15000,
    });

    // Invoice number should be visible
    await expect(page.locator("h1.font-mono")).toBeVisible({ timeout: 10000 });
  });

  // =========================================================================
  // Step 8: Verify all navigation pages work with data
  // =========================================================================

  test("Step 8 -- All major pages load without errors after setup", async () => {
    const pages = [
      { path: "/", title: "Dashboard" },
      { path: "/customers", title: "Customers" },
      { path: "/quotes", title: "Quotes" },
      { path: "/jobs", title: "Jobs" },
      { path: "/invoices", title: "Invoices" },
      { path: "/payments", title: "Payments" },
      { path: "/schedule", title: "Schedule" },
      { path: "/time-tracking", title: "Time Tracking" },
      { path: "/bookings", title: "Bookings" },
      { path: "/reviews", title: "Reviews" },
      { path: "/reports", title: "Reports" },
      { path: "/communications", title: "Communications" },
      { path: "/settings", title: "Business Information" },
    ];

    for (const { path, title } of pages) {
      await page.goto(path);
      await expect(
        page.locator("header").getByRole("heading", { level: 1 })
      ).toHaveText(title, { timeout: 10000 });

      // Verify no error message on the page
      await expect(page.locator("body")).not.toContainText(
        "Something went wrong",
        { timeout: 2000 }
      );
    }
  });

  // =========================================================================
  // Step 9: Verify profile page shows correct info
  // =========================================================================

  test("Step 9 -- Profile shows the registered user's info", async () => {
    await page.goto("/profile");
    await expect(
      page.locator("header").getByRole("heading", { level: 1 })
    ).toHaveText("Profile", { timeout: 10000 });

    // First name should be visible (profile form uses placeholder-based inputs)
    const firstNameInput = page.getByPlaceholder("John", { exact: true });
    await expect(firstNameInput).toBeVisible({ timeout: 5000 });
    const firstName = await firstNameInput.inputValue();
    expect(firstName).toBe(NEW_USER.firstName);

    // Last name should be visible
    const lastNameInput = page.getByPlaceholder("Doe", { exact: true });
    const lastName = await lastNameInput.inputValue();
    expect(lastName).toBe(NEW_USER.lastName);

    // Email should be visible
    const emailInput = page.getByPlaceholder("john@example.com", { exact: true });
    const email = await emailInput.inputValue();
    expect(email).toBe(NEW_USER.email);
  });

  // =========================================================================
  // Step 10: Log out and log back in
  // =========================================================================

  test("Step 10 -- Can log out and log back in successfully", async () => {
    // Click the user menu (avatar button in header)
    const userMenuBtn = page
      .locator("header")
      .locator("button")
      .filter({ hasText: NEW_USER.firstName });
    await userMenuBtn.click();

    // Click "Log Out"
    await page.getByRole("menuitem", { name: /log out/i }).click();

    // Should redirect to login page
    await expect(page).toHaveURL("/login", { timeout: 10000 });

    // Log back in with the registered credentials
    await page.getByLabel(/email/i).fill(NEW_USER.email);
    await page.getByLabel(/password/i).fill(NEW_USER.password);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should land on dashboard
    await expect(
      page.locator("header").getByRole("heading", { level: 1 })
    ).toHaveText("Dashboard", { timeout: 15000 });

    // Previous data should still be there (the customer we created)
    await page.goto("/customers");
    await expect(
      page.getByRole("link", { name: /FirstClient/ })
    ).toBeVisible({ timeout: 15000 });
  });
});

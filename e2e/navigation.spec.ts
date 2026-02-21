import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Phase 2 -- Dashboard Navigation Tests
// ---------------------------------------------------------------------------
// These tests verify the sidebar navigation, quick-actions dropdown,
// user menu, and page-title updates within the authenticated dashboard.
// Every describe block logs in via the login form in beforeEach.
// ---------------------------------------------------------------------------

/** Credentials for a pre-registered test user (registered once in beforeAll). */
let TEST_EMAIL: string;
const TEST_PASSWORD = "NavTestPassword123!";
const TEST_FIRST = "Nav";
const TEST_LAST = "Tester";
const TEST_BUSINESS = "Nav Test Business";

/** Helper: fill the login form and wait for the dashboard. */
async function loginViaForm(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(TEST_EMAIL);
  await page.getByLabel(/password/i).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait for the topbar heading to confirm we landed on the dashboard.
  // The topbar h1 always shows "Dashboard" on the root route.
  await expect(
    page.locator("header").getByRole("heading", { level: 1 })
  ).toHaveText("Dashboard", { timeout: 15000 });
}

// ---------------------------------------------------------------------------
// One-time setup: register a user that all navigation tests will share.
// ---------------------------------------------------------------------------
test.beforeAll(async ({ browser }) => {
  TEST_EMAIL = `nav-test-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;

  const page = await browser.newPage();
  await page.goto("/register");
  await page.getByLabel(/first name/i).fill(TEST_FIRST);
  await page.getByLabel(/last name/i).fill(TEST_LAST);
  await page.getByLabel(/email/i).fill(TEST_EMAIL);
  await page.getByLabel(/password/i).fill(TEST_PASSWORD);
  await page.getByLabel(/business name/i).fill(TEST_BUSINESS);
  await page.getByRole("button", { name: /create account/i }).click();

  await expect(
    page.locator("header").getByRole("heading", { level: 1 })
  ).toHaveText("Dashboard", { timeout: 15000 });

  await page.close();
});

// ---------------------------------------------------------------------------
// Sidebar Navigation
// ---------------------------------------------------------------------------
test.describe("Sidebar navigation", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaForm(page);
  });

  /**
   * All sidebar nav items and their expected URLs and page titles.
   * The sidebar component uses `navItems` for the main list and
   * `bottomItems` for Settings (pinned at the bottom).
   */
  const sidebarLinks = [
    { label: "Dashboard", href: "/", title: "Dashboard" },
    { label: "Customers", href: "/customers", title: "Customers" },
    { label: "Quotes", href: "/quotes", title: "Quotes" },
    { label: "Schedule", href: "/schedule", title: "Schedule" },
    { label: "Jobs", href: "/jobs", title: "Jobs" },
    { label: "Invoices", href: "/invoices", title: "Invoices" },
    { label: "Payments", href: "/payments", title: "Payments" },
    { label: "Time Tracking", href: "/time-tracking", title: "Time Tracking" },
    { label: "Bookings", href: "/bookings", title: "Bookings" },
    { label: "Reviews", href: "/reviews", title: "Reviews" },
    { label: "Reports", href: "/reports", title: "Reports" },
    {
      label: "Communications",
      href: "/communications",
      title: "Communications",
    },
    { label: "Settings", href: "/settings", title: "Settings" },
  ];

  for (const { label, href, title } of sidebarLinks) {
    test(`clicking "${label}" navigates to ${href}`, async ({ page }) => {
      // The sidebar is only visible on large screens (hidden lg:flex).
      // Playwright's default viewport (1280x720) satisfies `lg`.
      // Find the link inside the <aside> sidebar element.
      const sidebar = page.locator("aside");
      const link = sidebar.getByRole("link", { name: label, exact: true });

      await link.click();

      // Wait for the URL to update
      if (href === "/") {
        await expect(page).toHaveURL("/");
      } else {
        await expect(page).toHaveURL(new RegExp(href));
      }

      // The topbar <h1> should reflect the page title
      await expect(
        page.locator("header").getByRole("heading", { level: 1 })
      ).toHaveText(title, { timeout: 10000 });
    });
  }
});

// ---------------------------------------------------------------------------
// Quick Actions Dropdown
// ---------------------------------------------------------------------------
test.describe("Quick actions dropdown", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaForm(page);
  });

  test("opens and shows New Customer, New Quote, New Job, New Invoice", async ({
    page,
  }) => {
    // The quick-actions trigger is the "+" icon button in the topbar header.
    // It is an outline variant Button with a Plus icon.
    const header = page.locator("header");

    // The Plus button is the first dropdown trigger in the right side of the
    // topbar. We target the button that contains the svg Plus icon.
    const quickActionButton = header.locator('button[data-slot="trigger"]').first();

    // Fallback: if the radix trigger attribute is different, use a broader
    // selector -- the first small icon button in the header's right side.
    if (!(await quickActionButton.isVisible().catch(() => false))) {
      // Use a CSS approach: the quick actions button is `variant="outline" size="icon"`
      // which renders as a square button.
      await header
        .locator("button")
        .filter({ has: page.locator("svg") })
        .first()
        .click();
    } else {
      await quickActionButton.click();
    }

    // The dropdown content should now be visible with all four actions
    const expectedActions = [
      "New Customer",
      "New Quote",
      "New Job",
      "New Invoice",
    ];

    for (const actionLabel of expectedActions) {
      await expect(
        page.getByRole("menuitem", { name: actionLabel })
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("quick action links navigate to the correct pages", async ({
    page,
  }) => {
    const header = page.locator("header");

    // Open the quick actions dropdown
    // Target the Plus button -- it's the outline/icon button
    await header
      .locator("button")
      .filter({ has: page.locator("svg") })
      .first()
      .click();

    // Click "New Quote" as a representative test
    await page.getByRole("menuitem", { name: "New Quote" }).click();
    await expect(page).toHaveURL(/\/quotes\/new/, { timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// User Menu
// ---------------------------------------------------------------------------
test.describe("User menu", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaForm(page);
  });

  test("shows user name and has Profile, Settings, Log Out options", async ({
    page,
  }) => {
    // The user menu trigger is a button containing the avatar and the user's
    // first name (visible on sm+ screens).
    const header = page.locator("header");
    const userMenuTrigger = header.locator("button").filter({
      has: page.locator("span", { hasText: TEST_FIRST }),
    });
    await userMenuTrigger.click();

    // Full name should appear in the dropdown header
    await expect(
      page.getByText(`${TEST_FIRST} ${TEST_LAST}`)
    ).toBeVisible();

    // Menu items: Profile, Settings, Log Out
    await expect(
      page.getByRole("menuitem", { name: /profile/i })
    ).toBeVisible();
    await expect(
      page.getByRole("menuitem", { name: /settings/i })
    ).toBeVisible();
    await expect(
      page.getByRole("menuitem", { name: /log out/i })
    ).toBeVisible();
  });

  test("Profile link in user menu navigates to /profile", async ({
    page,
  }) => {
    const header = page.locator("header");
    const userMenuTrigger = header.locator("button").filter({
      has: page.locator("span", { hasText: TEST_FIRST }),
    });
    await userMenuTrigger.click();

    await page.getByRole("menuitem", { name: /profile/i }).click();
    await expect(page).toHaveURL(/\/profile/, { timeout: 10000 });
  });

  test("Settings link in user menu navigates to /settings", async ({
    page,
  }) => {
    const header = page.locator("header");
    const userMenuTrigger = header.locator("button").filter({
      has: page.locator("span", { hasText: TEST_FIRST }),
    });
    await userMenuTrigger.click();

    await page.getByRole("menuitem", { name: /settings/i }).click();
    await expect(page).toHaveURL(/\/settings/, { timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// Page Titles
// ---------------------------------------------------------------------------
test.describe("Page titles update when navigating", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaForm(page);
  });

  test("page title changes when navigating from Dashboard to Customers to Jobs", async ({
    page,
  }) => {
    const topbarTitle = page
      .locator("header")
      .getByRole("heading", { level: 1 });

    // Start on Dashboard
    await expect(topbarTitle).toHaveText("Dashboard");

    // Navigate to Customers
    const sidebar = page.locator("aside");
    await sidebar.getByRole("link", { name: "Customers", exact: true }).click();
    await expect(topbarTitle).toHaveText("Customers", { timeout: 10000 });
    await expect(page).toHaveURL(/\/customers/);

    // Navigate to Jobs
    await sidebar.getByRole("link", { name: "Jobs", exact: true }).click();
    await expect(topbarTitle).toHaveText("Jobs", { timeout: 10000 });
    await expect(page).toHaveURL(/\/jobs/);

    // Navigate to Invoices
    await sidebar.getByRole("link", { name: "Invoices", exact: true }).click();
    await expect(topbarTitle).toHaveText("Invoices", { timeout: 10000 });
    await expect(page).toHaveURL(/\/invoices/);

    // Navigate back to Dashboard
    await sidebar
      .getByRole("link", { name: "Dashboard", exact: true })
      .click();
    await expect(topbarTitle).toHaveText("Dashboard", { timeout: 10000 });
    await expect(page).toHaveURL("/");
  });

  test("page title for Settings shows correctly", async ({ page }) => {
    const topbarTitle = page
      .locator("header")
      .getByRole("heading", { level: 1 });

    const sidebar = page.locator("aside");
    await sidebar.getByRole("link", { name: "Settings", exact: true }).click();

    await expect(topbarTitle).toHaveText("Settings", { timeout: 10000 });
    await expect(page).toHaveURL(/\/settings/);
  });
});

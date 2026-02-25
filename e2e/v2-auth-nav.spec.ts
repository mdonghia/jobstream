import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// V2 Auth & Navigation Tests
// ---------------------------------------------------------------------------
// These tests verify the login flow, dashboard rendering, sidebar navigation,
// and logout for the V2 UI. They run against production using the demo account
// and make no database writes.
// ---------------------------------------------------------------------------

const DEMO_EMAIL = "demo@jobstream.app";
const DEMO_PASSWORD = "password123";

/** Log in with the demo account via the /login form. */
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(DEMO_EMAIL);
  await page.getByLabel(/password/i).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait for the dashboard to render (the main heading appears)
  await expect(
    page.getByRole("main").getByRole("heading", { level: 1 })
  ).toBeVisible({ timeout: 15000 });
}

// ---------------------------------------------------------------------------
// Login Flow
// ---------------------------------------------------------------------------
test.describe("V2 Login Flow", () => {
  test("can log in with demo credentials and land on the dashboard", async ({
    page,
  }) => {
    await page.goto("/login");

    // The login page heading should be visible
    await expect(
      page.getByRole("heading", { name: "Welcome back" })
    ).toBeVisible();

    // Fill in demo credentials
    await page.getByLabel(/email/i).fill(DEMO_EMAIL);
    await page.getByLabel(/password/i).fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should redirect to the dashboard (root path)
    await expect(
      page.getByRole("main").getByRole("heading", { level: 1 })
    ).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL("/");
  });
});

// ---------------------------------------------------------------------------
// V2 Dashboard Renders
// ---------------------------------------------------------------------------
test.describe("V2 Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("shows 'Welcome back' heading", async ({ page }) => {
    // The h1 on the dashboard contains "Welcome back, <name>!"
    const heading = page.getByRole("main").getByRole("heading", { level: 1 });
    await expect(heading).toContainText("Welcome back");
  });

  test("shows Action Items section with 4 cards", async ({ page }) => {
    // The "Action Items" section heading
    await expect(page.getByText("Action Items")).toBeVisible();

    // The 4 action item cards
    await expect(page.getByText("Unscheduled Jobs")).toBeVisible();
    await expect(page.getByText("Needs Invoicing")).toBeVisible();
    await expect(page.getByText("Overdue Quotes")).toBeVisible();
    await expect(page.getByText("Overdue Invoices")).toBeVisible();
  });

  test("shows Today's Progress section", async ({ page }) => {
    await expect(page.getByText("Progress")).toBeVisible();
    // The progress section shows "X of Y visits complete"
    await expect(page.getByText(/visits/i)).toBeVisible();
  });

  test("shows Revenue card", async ({ page }) => {
    // The Revenue card title is rendered as a CardTitle
    await expect(
      page.getByRole("main").getByText("Revenue", { exact: true })
    ).toBeVisible();
    // It should show at least one time range label
    await expect(page.getByText("Past 7 days").first()).toBeVisible();
  });

  test("shows Visits Completed card", async ({ page }) => {
    await expect(
      page.getByRole("main").getByText("Visits Completed", { exact: true })
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// V2 Sidebar Navigation -- Item Presence
// ---------------------------------------------------------------------------
test.describe("V2 Sidebar Navigation Items", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("sidebar shows exactly the expected nav items", async ({ page }) => {
    // The sidebar is an <aside> element visible on desktop (lg+).
    const sidebar = page.locator("aside");

    // These items SHOULD be present
    const expectedItems = [
      "Dashboard",
      "Jobs",
      "Customers",
      "Schedule",
      "Invoices",
      "Reports",
      "Settings",
    ];

    for (const item of expectedItems) {
      await expect(sidebar.getByText(item, { exact: true })).toBeVisible();
    }
  });

  test("sidebar does NOT show removed nav items", async ({ page }) => {
    const sidebar = page.locator("aside");

    // These items should NOT exist in the sidebar
    const removedItems = [
      "Quotes",
      "Payments",
      "Bookings",
      "Time Tracking",
      "Communications",
    ];

    for (const item of removedItems) {
      await expect(
        sidebar.getByText(item, { exact: true })
      ).not.toBeVisible();
    }
  });
});

// ---------------------------------------------------------------------------
// V2 Sidebar Navigation -- Links Work
// ---------------------------------------------------------------------------
test.describe("V2 Sidebar Navigation Works", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("clicking Jobs navigates to /jobs", async ({ page }) => {
    const sidebar = page.locator("aside");
    await sidebar.getByText("Jobs", { exact: true }).click();
    await expect(page).toHaveURL(/\/jobs/, { timeout: 10000 });
  });

  test("clicking Customers navigates to /customers", async ({ page }) => {
    const sidebar = page.locator("aside");
    await sidebar.getByText("Customers", { exact: true }).click();
    await expect(page).toHaveURL(/\/customers/, { timeout: 10000 });
  });

  test("clicking Schedule navigates to /schedule", async ({ page }) => {
    const sidebar = page.locator("aside");
    await sidebar.getByText("Schedule", { exact: true }).click();
    await expect(page).toHaveURL(/\/schedule/, { timeout: 10000 });
  });

  test("clicking Invoices navigates to /invoices", async ({ page }) => {
    const sidebar = page.locator("aside");
    await sidebar.getByText("Invoices", { exact: true }).click();
    await expect(page).toHaveURL(/\/invoices/, { timeout: 10000 });
  });

  test("clicking Reports navigates to /reports", async ({ page }) => {
    const sidebar = page.locator("aside");
    await sidebar.getByText("Reports", { exact: true }).click();
    await expect(page).toHaveURL(/\/reports/, { timeout: 10000 });
  });

  test("clicking Settings navigates to /settings", async ({ page }) => {
    const sidebar = page.locator("aside");
    await sidebar.getByText("Settings", { exact: true }).click();
    await expect(page).toHaveURL(/\/settings/, { timeout: 10000 });
  });

  test("clicking Dashboard navigates back to /", async ({ page }) => {
    // First navigate away from the dashboard
    const sidebar = page.locator("aside");
    await sidebar.getByText("Jobs", { exact: true }).click();
    await expect(page).toHaveURL(/\/jobs/, { timeout: 10000 });

    // Then click Dashboard to go back
    await sidebar.getByText("Dashboard", { exact: true }).click();
    await expect(page).toHaveURL("/", { timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------
test.describe("V2 Logout", () => {
  test("user can log out via the header dropdown", async ({ page }) => {
    await login(page);

    // Open the user menu dropdown in the header.
    // The topbar has a dropdown trigger button -- click the last button in the
    // header (the avatar / user-menu trigger).
    await page.locator("header").getByRole("button").last().click();

    // Click "Log Out" in the dropdown menu
    await page.getByRole("menuitem", { name: /log out/i }).click();

    // Should redirect to /login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // Verify we are actually logged out by trying to access a protected page
    await page.goto("/customers");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});

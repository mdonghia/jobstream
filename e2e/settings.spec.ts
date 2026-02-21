import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Phase 4 -- Settings & Profile Tests
// ---------------------------------------------------------------------------
// These tests verify general settings (business name, tax rate), the settings
// sub-nav highlighting, team member invitations, and the profile page.
// A fresh user is registered in beforeAll.
// ---------------------------------------------------------------------------

/** Credentials for the test user registered once in beforeAll. */
let TEST_EMAIL: string;
const TEST_PASSWORD = "SetTestPassword123!";
const TEST_FIRST = "Set";
const TEST_LAST = "Tester";
const TEST_BUSINESS = "Set Test Business";

/** Timestamp suffix used to make data unique per run. */
const TS = Date.now();

/** Helper: fill the login form and wait for the dashboard. */
async function loginViaForm(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(TEST_EMAIL);
  await page.getByLabel(/password/i).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Scope to header to avoid the duplicate h1 in main content
  await expect(
    page.locator("header").getByRole("heading", { level: 1 })
  ).toHaveText("Dashboard", { timeout: 15000 });
}

// ---------------------------------------------------------------------------
// One-time setup: register a fresh user.
// ---------------------------------------------------------------------------
test.beforeAll(async ({ browser }) => {
  TEST_EMAIL = `set-test-${TS}-${Math.floor(Math.random() * 10000)}@example.com`;

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
// Settings Redirect
// ---------------------------------------------------------------------------
test.describe("Settings redirect", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaForm(page);
  });

  test("settings page redirects to /settings/general", async ({ page }) => {
    await page.goto("/settings");

    // The page.tsx at /settings does a server-side redirect("/settings/general")
    await expect(page).toHaveURL(/\/settings\/general/, { timeout: 10000 });

    // The General settings form should load with the "Business Details" section
    await expect(
      page.getByRole("heading", { name: "Business Details" })
    ).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// General Settings
// ---------------------------------------------------------------------------
test.describe("General settings", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaForm(page);
  });

  test("can update business name", async ({ page }) => {
    await page.goto("/settings/general");

    // Wait for the form to load
    await expect(
      page.getByRole("heading", { name: "Business Details" })
    ).toBeVisible({ timeout: 10000 });

    // The business name input should have the current value
    const nameInput = page.getByPlaceholder("Your Business Name");
    await expect(nameInput).toBeVisible();

    // Clear and type a new business name
    const newName = `Updated Business ${TS}`;
    await nameInput.clear();
    await nameInput.fill(newName);

    // Click "Save Changes"
    await page.getByRole("button", { name: /save changes/i }).click();

    // Wait for success toast
    await expect(page.getByText("Settings saved")).toBeVisible({
      timeout: 10000,
    });

    // Reload the page and verify the name persisted
    await page.reload();
    await expect(nameInput).toHaveValue(newName, { timeout: 10000 });
  });

  test("can update tax rate", async ({ page }) => {
    await page.goto("/settings/general");

    // Wait for the Operational Settings section to load
    await expect(
      page.getByRole("heading", { name: "Operational Settings" })
    ).toBeVisible({ timeout: 10000 });

    // The tax rate input is labeled "Default Tax Rate (%)" -- it has
    // type="number" with placeholder "0.00"
    // We target the input within the Operational Settings section
    const taxInput = page.getByPlaceholder("0.00");
    await expect(taxInput).toBeVisible();

    // Set a new tax rate
    await taxInput.clear();
    await taxInput.fill("8.25");

    // Save
    await page.getByRole("button", { name: /save changes/i }).click();

    // Wait for success toast
    await expect(page.getByText("Settings saved")).toBeVisible({
      timeout: 10000,
    });

    // Reload and verify persistence
    await page.reload();
    await expect(taxInput).toHaveValue("8.25", { timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// Settings Sub-Nav
// ---------------------------------------------------------------------------
test.describe("Settings sub-nav", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaForm(page);
  });

  test("highlights the active page in settings sub-nav", async ({ page }) => {
    await page.goto("/settings/general");

    // The settings layout renders a <nav> with links. The active link
    // gets the class "bg-[#635BFF]/10 text-[#635BFF]".
    // Verify "General" is the active link
    const generalLink = page.getByRole("link", { name: "General", exact: true });
    await expect(generalLink).toBeVisible({ timeout: 10000 });
    await expect(generalLink).toHaveClass(/bg-\[#635BFF\]/);

    // Navigate to Team Members
    await page.getByRole("link", { name: "Team Members", exact: true }).click();
    await expect(page).toHaveURL(/\/settings\/team/, { timeout: 10000 });

    // Now "Team Members" should be active
    const teamLink = page.getByRole("link", { name: "Team Members", exact: true });
    await expect(teamLink).toHaveClass(/bg-\[#635BFF\]/);

    // And "General" should no longer be active
    const generalLinkAfter = page.getByRole("link", {
      name: "General",
      exact: true,
    });
    await expect(generalLinkAfter).not.toHaveClass(/bg-\[#635BFF\]/);
  });
});

// ---------------------------------------------------------------------------
// Team Members
// ---------------------------------------------------------------------------
test.describe("Team members", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaForm(page);
  });

  test("can invite a team member", async ({ page }) => {
    await page.goto("/settings/team");

    // Wait for the Team Members heading to appear
    await expect(
      page.getByRole("heading", { name: "Team Members" })
    ).toBeVisible({ timeout: 10000 });

    // The current user should be listed (they are the OWNER)
    await expect(
      page.getByText(`${TEST_FIRST} ${TEST_LAST}`)
    ).toBeVisible();

    // Click "Invite Team Member" button
    await page
      .getByRole("button", { name: /invite team member/i })
      .click();

    // The invite dialog should open
    await expect(
      page.getByRole("heading", { name: "Invite Team Member" })
    ).toBeVisible({ timeout: 5000 });

    // Fill out the invite form
    await page.getByPlaceholder("John").fill(`Invited-${TS}`);
    await page.getByPlaceholder("Doe").fill("Member");
    await page
      .getByPlaceholder("john@example.com")
      .fill(`invited-${TS}@example.com`);

    // Role defaults to "Technician" -- leave as is

    // Submit
    await page.getByRole("button", { name: /send invitation/i }).click();

    // Wait for success toast
    await expect(page.getByText("Team member invited")).toBeVisible({
      timeout: 10000,
    });

    // The new member should appear in the table
    await expect(
      page.getByText(`Invited-${TS} Member`)
    ).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// Profile Page
// ---------------------------------------------------------------------------
test.describe("Profile page", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaForm(page);
  });

  test("profile page loads at /profile", async ({ page }) => {
    await page.goto("/profile");

    // The profile page has the heading "Personal Information"
    await expect(
      page.getByRole("heading", { name: "Personal Information" })
    ).toBeVisible({ timeout: 10000 });

    // It also has a "Change Password" section
    await expect(
      page.getByRole("heading", { name: "Change Password" })
    ).toBeVisible();

    // The first name and last name inputs should be pre-filled
    const firstNameInput = page.getByPlaceholder("John");
    await expect(firstNameInput).toHaveValue(TEST_FIRST, { timeout: 5000 });

    const lastNameInput = page.getByPlaceholder("Doe");
    await expect(lastNameInput).toHaveValue(TEST_LAST);

    // The email input should have the test email
    const emailInput = page.getByPlaceholder("john@example.com");
    await expect(emailInput).toHaveValue(TEST_EMAIL);

    // The "Save Profile" button should be visible
    await expect(
      page.getByRole("button", { name: /save profile/i })
    ).toBeVisible();
  });
});

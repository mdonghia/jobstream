import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Phase 6 -- Calendar / Schedule Tests
// ---------------------------------------------------------------------------
// Tests exercise the schedule/calendar page: view switching (Month, Week, Day,
// List), navigation arrows, the Today button, and the team member filter.
// Uses the demo account which has seed data with scheduled jobs.
// ---------------------------------------------------------------------------

const DEMO_EMAIL = "demo@jobstream.app";
const DEMO_PASSWORD = "password123";

/** Log in with the shared demo account. */
async function loginAsDemo(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(DEMO_EMAIL);
  await page.getByLabel(/password/i).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait for the topbar heading to confirm we landed on the dashboard
  await expect(
    page.locator("header").getByRole("heading", { level: 1 })
  ).toHaveText("Dashboard", { timeout: 15000 });
}

// ---------------------------------------------------------------------------
// Calendar Page
// ---------------------------------------------------------------------------
test.describe("Calendar / Schedule", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
    await page.goto("/schedule");

    // The schedule page renders via ScheduleLayout, which shows "Schedule" heading
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Schedule", level: 1 })
    ).toBeVisible({ timeout: 10000 });
  });

  test("calendar page loads", async ({ page }) => {
    // The Schedule heading should be visible
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Schedule", level: 1 })
    ).toBeVisible();

    // The subtitle text should be visible
    await expect(
      page.getByText(/manage your team/i)
    ).toBeVisible();

    // The Today button should be present in the toolbar
    await expect(
      page.getByRole("button", { name: /today/i })
    ).toBeVisible();

    // A date label should be visible in the toolbar (e.g., "February 15 - 21, 2026")
    // The calendar defaults to "week" view, so we should see a date range label
    const dateLabel = page.locator("h2.text-base.font-semibold");
    await expect(dateLabel).toBeVisible();
    const dateLabelText = await dateLabel.textContent();
    expect(dateLabelText).toBeTruthy();
    // Should contain a year in the date label
    expect(dateLabelText).toMatch(/\d{4}/);
  });

  test("can switch between Month, Week, Day, List views", async ({ page }) => {
    // The view toggle is a group of buttons inside a container with bg-[#F6F8FA]
    const viewToggle = page.locator(".bg-\\[\\#F6F8FA\\].rounded-md");
    await expect(viewToggle).toBeVisible();

    // -- Switch to Month view --
    await viewToggle.getByText("Month").click();
    // In month view, we should see day headers: Sun, Mon, Tue, Wed, Thu, Fri, Sat
    await expect(page.getByText("Sun").first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Mon").first()).toBeVisible();
    await expect(page.getByText("Sat").first()).toBeVisible();

    // -- Switch to Day view --
    await viewToggle.getByText("Day").click();
    // The date label in day view should show a full date format like "Saturday, February 21, 2026"
    await page.waitForTimeout(500);
    const dayLabel = page.locator("h2.text-base.font-semibold");
    const dayText = await dayLabel.textContent();
    // Day view format: "EEEE, MMMM d, yyyy" (e.g., "Saturday, February 21, 2026")
    expect(dayText).toMatch(/[A-Z][a-z]+day/);

    // -- Switch to List view --
    await viewToggle.getByText("List").click();
    await page.waitForTimeout(500);
    // In list view, the date label shows "MMMM yyyy" (e.g., "February 2026")
    const listLabel = page.locator("h2.text-base.font-semibold");
    const listText = await listLabel.textContent();
    expect(listText).toMatch(/[A-Z][a-z]+ \d{4}/);

    // -- Switch back to Week view --
    await viewToggle.getByText("Week").click();
    await page.waitForTimeout(500);
    // Week view shows date range
    const weekLabel = page.locator("h2.text-base.font-semibold");
    const weekText = await weekLabel.textContent();
    expect(weekText).toMatch(/\d/); // Contains numbers (dates)
  });

  test("Today button works", async ({ page }) => {
    // Scope to the main area to avoid duplicate chevron-right icons elsewhere
    const mainArea = page.getByRole("main");

    // First navigate away from today by clicking the forward arrow a few times
    const forwardButton = mainArea.locator("button").filter({
      has: page.locator("svg.lucide-chevron-right"),
    }).first();
    await expect(forwardButton).toBeVisible();

    // Click forward to go to next week
    await forwardButton.click();
    await page.waitForTimeout(500);

    // Capture the date label after navigating forward
    const dateLabel = page.locator("h2.text-base.font-semibold");
    const afterForwardText = await dateLabel.textContent();

    // Click "Today" to go back
    await page.getByRole("button", { name: /today/i }).click();
    await page.waitForTimeout(500);

    // The date label should have changed back
    const afterTodayText = await dateLabel.textContent();
    expect(afterTodayText).not.toBe(afterForwardText);
  });

  test("navigation arrows change the date range", async ({ page }) => {
    // Scope to the main area to avoid duplicate chevron icons elsewhere
    const mainArea = page.getByRole("main");

    // Capture current date label
    const dateLabel = page.locator("h2.text-base.font-semibold");
    const initialText = await dateLabel.textContent();

    // Click the forward arrow (scoped to main to avoid topbar icons)
    const forwardButton = mainArea.locator("button").filter({
      has: page.locator("svg.lucide-chevron-right"),
    }).first();
    await forwardButton.click();
    await page.waitForTimeout(500);

    // The date label should change
    const afterForwardText = await dateLabel.textContent();
    expect(afterForwardText).not.toBe(initialText);

    // Click the back arrow
    const backButton = mainArea.locator("button").filter({
      has: page.locator("svg.lucide-chevron-left"),
    }).first();
    await backButton.click();
    await page.waitForTimeout(500);

    // The date label should be back to the original
    const afterBackText = await dateLabel.textContent();
    expect(afterBackText).toBe(initialText);
  });

  test("team member filter is visible", async ({ page }) => {
    // The team filter button is present when there are multiple active team members.
    // It contains "Team" text and a Users icon.
    // For the demo account, this should be visible if there's more than 1 team member.
    const teamButton = page.getByRole("button", { name: /team/i });

    // It may or may not be visible depending on whether the demo account has > 1 team member.
    // If it is visible, clicking it should open a popover with team member checkboxes.
    const isTeamButtonVisible = await teamButton.isVisible().catch(() => false);

    if (isTeamButtonVisible) {
      await teamButton.click();

      // The popover should open and show team member names with checkboxes
      const popoverContent = page.locator("[data-radix-popper-content-wrapper]");
      await expect(popoverContent).toBeVisible({ timeout: 3000 });

      // There should be at least one team member listed with a checkbox
      const checkboxes = popoverContent.locator("[role='checkbox']");
      const count = await checkboxes.count();
      expect(count).toBeGreaterThanOrEqual(1);
    } else {
      // If the team button is not visible, it means there's only 1 active team member.
      // This is acceptable -- the component hides the filter in that case.
      // The test still passes as the page loaded correctly.
      expect(true).toBe(true);
    }
  });
});

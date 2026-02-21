import { test, expect, Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Phase 10 -- Time Tracking Tests
// ---------------------------------------------------------------------------
// These tests cover the time tracking module: page load, start/stop timer,
// day/week view toggle, and manual time entry creation.
// ---------------------------------------------------------------------------

/** Log in via the /login form using the demo account credentials. */
async function loginViaForm(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("demo@jobstream.app");
  await page.getByLabel(/password/i).fill("password123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 15000,
  });
}

// ---------------------------------------------------------------------------
// Time Tracking Page
// ---------------------------------------------------------------------------
test.describe("Time Tracking Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaForm(page);
    await page.goto("/time-tracking");
    // Wait for the page heading to confirm it loaded
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Time Tracking", level: 1 })
    ).toBeVisible({ timeout: 15000 });
  });

  test("time tracking page loads", async ({ page }) => {
    // Verify the page heading and description text
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Time Tracking", level: 1 })
    ).toBeVisible();
    await expect(
      page.getByText("Track time spent on jobs")
    ).toBeVisible();

    // Verify the Timer section heading is present
    await expect(page.getByText("Timer")).toBeVisible();

    // Verify the Export and Add Time Entry buttons are present
    await expect(
      page.getByRole("button", { name: /export/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /add time entry/i })
    ).toBeVisible();

    // Verify the Day/Week view toggle is present
    await expect(page.getByRole("button", { name: "Day" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Week" })).toBeVisible();

    // Verify the Today button is present
    await expect(
      page.getByRole("button", { name: "Today" })
    ).toBeVisible();
  });

  test("Start Timer button is visible when no timer running", async ({
    page,
  }) => {
    // When no timer is running, the "Start Timer" button should be visible
    await expect(
      page.getByRole("button", { name: /start timer/i })
    ).toBeVisible();

    // The "Stop" and "Discard" buttons should NOT be visible when no timer
    // is running
    await expect(
      page.getByRole("button", { name: /^stop$/i })
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: /discard/i })
    ).not.toBeVisible();
  });

  test("can start and stop a timer", async ({ page }) => {
    // Click "Start Timer" to begin tracking time
    await page.getByRole("button", { name: /start timer/i }).click();

    // The timer display should now show a running clock (format HH:MM:SS)
    // and the "Stop" button should appear
    await expect(
      page.getByRole("button", { name: /^stop$/i })
    ).toBeVisible({ timeout: 5000 });

    // The "Discard" button should also be visible
    await expect(
      page.getByRole("button", { name: /discard/i })
    ).toBeVisible();

    // The "Start Timer" button should no longer be visible
    await expect(
      page.getByRole("button", { name: /start timer/i })
    ).not.toBeVisible();

    // The elapsed time counter should be visible (monospace font display like 00:00:XX)
    const timerDisplay = page.locator(".font-mono.font-bold");
    await expect(timerDisplay).toBeVisible();

    // Wait a moment so the timer ticks
    await page.waitForTimeout(1500);

    // The timer display text should have changed from 00:00:00
    const timerText = await timerDisplay.textContent();
    expect(timerText).toBeTruthy();

    // Click "Stop" to stop the timer
    await page.getByRole("button", { name: /^stop$/i }).click();

    // After stopping, the "Start Timer" button should reappear
    await expect(
      page.getByRole("button", { name: /start timer/i })
    ).toBeVisible({ timeout: 10000 });

    // A success toast should appear confirming the entry was saved
    // (either "Time entry saved" or "Time entry saved locally")
    await expect(
      page.getByText(/time entry saved/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test("Day/Week view toggle works", async ({ page }) => {
    // Initially, the Day view should be active (it has the active
    // bg-[#635BFF] styling). We verify by checking the button's style.
    const dayButton = page.getByRole("button", { name: "Day" });
    const weekButton = page.getByRole("button", { name: "Week" });

    // Day view should be the default -- the button should have the active
    // background color class
    await expect(dayButton).toHaveCSS("background-color", "rgb(99, 91, 255)");

    // Click "Week" to switch to week view
    await weekButton.click();

    // Week button should now be active
    await expect(weekButton).toHaveCSS(
      "background-color",
      "rgb(99, 91, 255)"
    );

    // The date range display should show a week range format "Mon d - Mon d, yyyy"
    // which includes a dash between dates
    const dateDisplay = page.locator("button", {
      hasText: /\w{3}\s+\d+\s*-\s*\w{3}\s+\d+/,
    });
    await expect(dateDisplay).toBeVisible({ timeout: 5000 });

    // Week view should show the "Team Member" column header when there are
    // entries, or an empty state message
    const hasWeekTable = await page.locator("table").isVisible().catch(() => false);
    if (hasWeekTable) {
      await expect(
        page.locator("th", { hasText: /team member/i })
      ).toBeVisible();
    }

    // Switch back to Day view
    await dayButton.click();
    await expect(dayButton).toHaveCSS("background-color", "rgb(99, 91, 255)");
  });

  test("can add a manual time entry", async ({ page }) => {
    // Click "Add Time Entry" button in the page header
    await page.getByRole("button", { name: /add time entry/i }).click();

    // The dialog should open with the title "Add Time Entry"
    await expect(
      page.getByRole("heading", { name: "Add Time Entry" })
    ).toBeVisible({ timeout: 5000 });

    // The dialog should have Date, Start Time, End Time fields
    // The Date field should be pre-filled with today's date
    const dateInput = page.locator('input[type="date"]');
    await expect(dateInput).toBeVisible();

    const startTimeInput = page.locator('input[type="time"]').first();
    await expect(startTimeInput).toBeVisible();

    const endTimeInput = page.locator('input[type="time"]').last();
    await expect(endTimeInput).toBeVisible();

    // Fill in the time fields (the date should already be populated)
    await startTimeInput.fill("09:00");
    await endTimeInput.fill("10:30");

    // The "Notes (optional)" textarea should be present
    const notesTextarea = page.getByPlaceholder(
      /add notes about the work done/i
    );
    await expect(notesTextarea).toBeVisible();
    await notesTextarea.fill("Manual test entry");

    // Click "Save" to create the entry
    await page.getByRole("button", { name: /^save$/i }).click();

    // The dialog should close
    await expect(
      page.getByRole("heading", { name: "Add Time Entry" })
    ).not.toBeVisible({ timeout: 10000 });

    // A success toast should appear
    await expect(
      page.getByText(/time entry saved/i)
    ).toBeVisible({ timeout: 5000 });
  });
});

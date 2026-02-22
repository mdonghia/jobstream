import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Phase 14 -- Reviews Page Tests
// ---------------------------------------------------------------------------
// Tests for the Reviews page: summary cards, filter dropdowns,
// and the Add Review dialog.
// ---------------------------------------------------------------------------

async function loginViaForm(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('demo@jobstream.app');
  await page.getByLabel(/password/i).fill('password123');
  await page.getByRole('button', { name: /sign in/i }).click();
  // Wait for the topbar heading to confirm we landed on the dashboard
  await expect(
    page.locator("header").getByRole("heading", { level: 1 })
  ).toHaveText("Dashboard", { timeout: 15000 });
}

test.describe("Reviews Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaForm(page);
  });

  // -------------------------------------------------------------------------
  // Page Load
  // -------------------------------------------------------------------------
  test("Reviews page loads when logged in", async ({ page }) => {
    await page.goto("/reviews");

    // Page heading
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Reviews", level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // Subtext
    await expect(
      page.getByText("Track and respond to customer reviews")
    ).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Summary Cards
  // -------------------------------------------------------------------------
  test("Summary cards are visible (Average Rating, Total Reviews, Response Rate, Requests Sent)", async ({
    page,
  }) => {
    await page.goto("/reviews");

    await expect(
      page.getByRole("main").getByRole("heading", { name: "Reviews", level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // Each summary card has an uppercase label rendered as a <p> tag.
    // The text content is "AVERAGE RATING", "TOTAL REVIEWS", etc. because
    // of the `uppercase` CSS class. We use case-insensitive matching.
    await expect(page.getByText(/average rating/i)).toBeVisible();
    await expect(page.getByText(/total reviews/i)).toBeVisible();
    await expect(page.getByText(/response rate/i)).toBeVisible();
    await expect(page.getByText(/requests sent/i)).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Filter Dropdowns
  // -------------------------------------------------------------------------
  test("Filter dropdowns work (Platform, Rating, Responded)", async ({
    page,
  }) => {
    await page.goto("/reviews");

    await expect(
      page.getByRole("main").getByRole("heading", { name: "Reviews", level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // Platform filter -- the trigger shows "All Platforms" by default
    const platformTrigger = page.getByRole("combobox").filter({
      hasText: /all platforms/i,
    });
    await expect(platformTrigger).toBeVisible();
    await platformTrigger.click();

    // Check that platform options are available in the dropdown
    await expect(page.getByRole("option", { name: "Google" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Yelp" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Facebook" })).toBeVisible();

    // Select Google to verify the dropdown works
    await page.getByRole("option", { name: "Google" }).click();

    // Rating filter -- the trigger shows "All Ratings" by default
    const ratingTrigger = page.getByRole("combobox").filter({
      hasText: /all ratings/i,
    });
    await expect(ratingTrigger).toBeVisible();
    await ratingTrigger.click();
    await expect(page.getByRole("option", { name: "5 Stars" })).toBeVisible();
    await expect(page.getByRole("option", { name: "1 Star" })).toBeVisible();

    // Close rating dropdown by pressing Escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // Responded filter -- the trigger shows "All" by default.
    // After closing the rating dropdown, find the combobox that shows exactly "All"
    // (not "All Platforms" or "All Ratings"). Use nth(2) since order is:
    // 0=Platform (now "Google"), 1=Rating (still "All Ratings"), 2=Responded ("All")
    const allComboboxes = page.getByRole("combobox");
    // The responded filter is the 3rd combobox (index 2) in the filter row
    const respondedTrigger = allComboboxes.nth(2);
    await expect(respondedTrigger).toBeVisible();
    await respondedTrigger.click();
    await expect(
      page.getByRole("option", { name: "Responded", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("option", { name: "Not Responded", exact: true })
    ).toBeVisible();

    // Close dropdown
    await page.keyboard.press("Escape");
  });

  // -------------------------------------------------------------------------
  // Add Review Dialog
  // -------------------------------------------------------------------------
  test("Can open Add Review dialog", async ({ page }) => {
    await page.goto("/reviews");

    await expect(
      page.getByRole("main").getByRole("heading", { name: "Reviews", level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // Click the "Add Review" button in the page header
    await page.getByRole("button", { name: /add review/i }).click();

    // The dialog should open with a title "Add Review"
    await expect(
      page.getByRole("heading", { name: "Add Review" })
    ).toBeVisible();

    // Dialog description
    await expect(
      page.getByText("Manually add a review from an external platform.")
    ).toBeVisible();
  });

  test("Add Review dialog has all required fields (Platform, Reviewer name, Rating, Content, Date)", async ({
    page,
  }) => {
    await page.goto("/reviews");

    await expect(
      page.getByRole("main").getByRole("heading", { name: "Reviews", level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // Open the dialog
    await page.getByRole("button", { name: /add review/i }).click();

    await expect(
      page.getByRole("heading", { name: "Add Review" })
    ).toBeVisible();

    // Platform field -- Label "Platform" and a select/combobox
    await expect(
      page.locator("dialog, [role='dialog']").getByText("Platform", { exact: true })
    ).toBeVisible();

    // Reviewer Name field -- Input with placeholder "John Smith"
    await expect(
      page.locator("dialog, [role='dialog']").getByText("Reviewer Name")
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("John Smith")
    ).toBeVisible();

    // Rating field -- Label "Rating" and interactive stars
    await expect(
      page.locator("dialog, [role='dialog']").getByText("Rating", { exact: true })
    ).toBeVisible();

    // Content field -- Textarea with placeholder
    await expect(
      page.locator("dialog, [role='dialog']").getByText(/review content/i)
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("Paste the review content here...")
    ).toBeVisible();

    // Review Date field -- date input
    await expect(
      page.locator("dialog, [role='dialog']").getByText("Review Date")
    ).toBeVisible();

    // URL field (optional)
    await expect(
      page.locator("dialog, [role='dialog']").getByText(/url/i)
    ).toBeVisible();

    // Dialog footer buttons
    await expect(
      page.getByRole("button", { name: /cancel/i })
    ).toBeVisible();
    await expect(
      page.locator("dialog, [role='dialog']").getByRole("button", { name: /add review/i })
    ).toBeVisible();
  });
});

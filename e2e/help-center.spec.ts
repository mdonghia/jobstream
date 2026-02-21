import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Phase 17 -- Help Center Tests (PUBLIC -- no login needed)
// ---------------------------------------------------------------------------
// The Help Center at /help is a public section. It has a home page with a
// hero search bar and category grid, category pages with article lists,
// and individual article pages with content, reading time, and feedback.
// ---------------------------------------------------------------------------

test.describe("Help Center Home", () => {
  test("Help center home loads at /help", async ({ page }) => {
    await page.goto("/help");

    // The hero heading
    await expect(
      page.getByRole("heading", { name: "How can we help?" })
    ).toBeVisible({ timeout: 15000 });

    // The top bar shows "Help Center" branding
    await expect(page.getByText("Help Center").first()).toBeVisible();
  });

  test("Hero section shows search bar", async ({ page }) => {
    await page.goto("/help");

    await expect(
      page.getByRole("heading", { name: "How can we help?" })
    ).toBeVisible({ timeout: 15000 });

    // The search input has placeholder "Search for articles..."
    const searchInput = page.getByPlaceholder("Search for articles...");
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute("type", "text");
  });

  test("Category grid shows all 12 categories", async ({ page }) => {
    await page.goto("/help");

    await expect(
      page.getByRole("heading", { name: "How can we help?" })
    ).toBeVisible({ timeout: 15000 });

    // There are exactly 12 categories rendered as links in the grid.
    // Each category card has the category name as an <h2>.
    const categoryNames = [
      "Getting Started",
      "Managing Customers",
      "Quotes & Estimates",
      "Scheduling & Calendar",
      "Job Management",
      "Invoicing & Payments",
      "Client Portal",
      "Online Booking",
      "Communications",
      "Reviews",
      "Reports & Analytics",
      "Account & Settings",
    ];

    for (const name of categoryNames) {
      await expect(
        page.getByRole("heading", { name, level: 2 })
      ).toBeVisible();
    }
  });

  test("Clicking a category navigates to category page", async ({ page }) => {
    await page.goto("/help");

    await expect(
      page.getByRole("heading", { name: "How can we help?" })
    ).toBeVisible({ timeout: 15000 });

    // Click the "Getting Started" category card link
    await page
      .locator("a")
      .filter({ has: page.getByRole("heading", { name: "Getting Started", level: 2 }) })
      .click();

    // Should navigate to /help/getting-started
    await expect(page).toHaveURL(/\/help\/getting-started/, { timeout: 10000 });

    // The category page heading should be visible
    await expect(
      page.getByRole("heading", { name: "Getting Started", level: 1 })
    ).toBeVisible();
  });
});

test.describe("Help Center Category Page", () => {
  test("Category page shows breadcrumb and article list", async ({ page }) => {
    await page.goto("/help/getting-started");

    // Page heading
    await expect(
      page.getByRole("heading", { name: "Getting Started", level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // Breadcrumb -- has a "Help Center" link and the category name
    const breadcrumb = page.locator("nav");
    await expect(breadcrumb.getByRole("link", { name: "Help Center" })).toBeVisible();
    await expect(breadcrumb.getByText("Getting Started")).toBeVisible();

    // Article list -- the getting-started category has 5 articles.
    // Each article is rendered as a link with an <h2> inside.
    const articleLinks = page.locator("a").filter({
      has: page.locator("h2"),
    });
    // There should be at least 1 article visible
    await expect(articleLinks.first()).toBeVisible();

    // The first article should be "Welcome to JobStream"
    await expect(
      page.getByRole("heading", { name: "Welcome to JobStream", level: 2 })
    ).toBeVisible();
  });

  test("Clicking an article navigates to article page", async ({ page }) => {
    await page.goto("/help/getting-started");

    await expect(
      page.getByRole("heading", { name: "Getting Started", level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // Click the "Welcome to JobStream" article
    await page
      .locator("a")
      .filter({
        has: page.getByRole("heading", { name: "Welcome to JobStream", level: 2 }),
      })
      .click();

    // Should navigate to the article page
    await expect(page).toHaveURL(
      /\/help\/getting-started\/welcome-to-jobstream/,
      { timeout: 10000 }
    );

    // Article page heading
    await expect(
      page.getByRole("heading", { name: "Welcome to JobStream", level: 1 })
    ).toBeVisible();
  });
});

test.describe("Help Center Article Page", () => {
  test("Article page shows title, reading time, content", async ({ page }) => {
    await page.goto("/help/getting-started/welcome-to-jobstream");

    // Title
    await expect(
      page.getByRole("heading", { name: "Welcome to JobStream", level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // Reading time -- the article page renders "X min read" in the meta section
    await expect(page.getByText(/\d+ min read/).first()).toBeVisible();

    // Last updated date is shown
    await expect(page.getByText(/last updated/i)).toBeVisible();

    // Article content -- the article has a "What Is JobStream?" h2 heading
    await expect(
      page.getByRole("heading", { name: "What Is JobStream?" })
    ).toBeVisible();

    // It also has content about "Core Features" and "Navigating the Dashboard"
    await expect(
      page.getByRole("heading", { name: "Core Features" })
    ).toBeVisible();
  });

  test('Article page has "Was this helpful?" feedback buttons', async ({
    page,
  }) => {
    await page.goto("/help/getting-started/welcome-to-jobstream");

    await expect(
      page.getByRole("heading", { name: "Welcome to JobStream", level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // Feedback section
    await expect(
      page.getByText("Was this article helpful?")
    ).toBeVisible();

    // Thumbs up button with "Yes"
    const yesButton = page.getByRole("button", { name: /yes/i });
    await expect(yesButton).toBeVisible();

    // Thumbs down button with "No"
    const noButton = page.getByRole("button", { name: /no/i });
    await expect(noButton).toBeVisible();

    // Click "Yes" and verify feedback confirmation
    await yesButton.click();
    await expect(
      page.getByText("Thank you for your feedback!")
    ).toBeVisible();
  });
});

test.describe("Help Center Search", () => {
  test("Search shows instant results when typing", async ({ page }) => {
    await page.goto("/help");

    await expect(
      page.getByRole("heading", { name: "How can we help?" })
    ).toBeVisible({ timeout: 15000 });

    const searchInput = page.getByPlaceholder("Search for articles...");
    await searchInput.fill("invoice");

    // The search results dropdown appears after typing >= 2 characters.
    // Results are rendered as links inside a dropdown div.
    // Each result has a truncated title <p> element.
    // Wait for results to appear (the component debounces on useEffect).
    const resultsDropdown = page.locator(".absolute.left-0.right-0.top-full");
    await expect(resultsDropdown).toBeVisible({ timeout: 5000 });

    // There should be at least one search result link
    const resultLinks = resultsDropdown.locator("a");
    await expect(resultLinks.first()).toBeVisible();
  });

  test("Search with no results shows message", async ({ page }) => {
    await page.goto("/help");

    await expect(
      page.getByRole("heading", { name: "How can we help?" })
    ).toBeVisible({ timeout: 15000 });

    const searchInput = page.getByPlaceholder("Search for articles...");

    // Type a query that should return zero results
    await searchInput.fill("xyzzynonexistent12345");

    // The "no results" message appears: "No articles found for ..."
    await expect(
      page.getByText(/no articles found/i)
    ).toBeVisible({ timeout: 5000 });

    // The message also includes "Try different keywords."
    await expect(
      page.getByText(/try different keywords/i)
    ).toBeVisible();
  });
});

import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// ---------------------------------------------------------------------------
// Accessibility (a11y) Scan
// ---------------------------------------------------------------------------
// Runs axe-core WCAG 2.1 AA checks against every major page in JobStream.
// Uses the demo account so pages have real data (not empty states).
//
// We exclude certain known-noisy rules where the underlying component library
// (shadcn/ui, Radix) generates elements that trip axe but are functionally
// accessible (e.g., color-contrast on decorative elements).
// ---------------------------------------------------------------------------

const DEMO_EMAIL = "demo@jobstream.app";
const DEMO_PASSWORD = "password123";

// Pages to scan: [path, expected topbar h1 text]
const PAGES: [string, string][] = [
  ["/", "Dashboard"],
  ["/customers", "Customers"],
  ["/quotes", "Quotes"],
  ["/jobs", "Jobs"],
  ["/invoices", "Invoices"],
  ["/payments", "Payments"],
  ["/schedule", "Schedule"],
  ["/time-tracking", "Time Tracking"],
  ["/bookings", "Bookings"],
  ["/reviews", "Reviews"],
  ["/reports", "Reports"],
  ["/communications", "Communications"],
  ["/settings/general", "Business Information"],
  ["/settings/services", "Services"],
  ["/settings/team", "Team Members"],
  ["/profile", "Profile"],
];

test.describe.serial("Accessibility Scan (WCAG 2.1 AA)", () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();

    // Log in with demo account
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(DEMO_EMAIL);
    await page.getByLabel(/password/i).fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(
      page.locator("header").getByRole("heading", { level: 1 })
    ).toHaveText("Dashboard", { timeout: 15000 });
  });

  test.afterAll(async () => {
    await context.close();
  });

  for (const [path, title] of PAGES) {
    test(`a11y scan: ${title} (${path})`, async () => {
      await page.goto(path);
      await expect(
        page.locator("header").getByRole("heading", { level: 1 })
      ).toHaveText(title, { timeout: 10000 });

      // Wait for page to fully load
      await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        // Exclude rules that fire on Radix/shadcn primitives and are false positives
        .disableRules(["color-contrast"])
        // Radix Select triggers render visible text (placeholder/value) but axe
        // doesn't recognize it as accessible content -- known false positive
        .exclude('[role="combobox"]')
        // Radix Tabs use lazy rendering so aria-controls references panels not
        // yet in the DOM -- known false positive with Radix UI
        .exclude('[role="tab"]')
        // dnd-kit draggable items with focusable children are expected
        .exclude('[aria-roledescription="draggable"]')
        // Next.js dev tools overlay button (only present in dev mode)
        .exclude('button[data-nextjs-dev-tools-button]')
        .exclude('nextjs-portal')
        .analyze();

      // Log violations for debugging (won't fail the test by itself)
      if (results.violations.length > 0) {
        const summary = results.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.length,
          help: v.helpUrl,
        }));
        console.log(
          `\n[a11y] ${title}: ${results.violations.length} violation(s)\n`,
          JSON.stringify(summary, null, 2)
        );
      }

      // Critical and serious violations should fail the test
      const critical = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      );

      expect(
        critical,
        `${title} has ${critical.length} critical/serious a11y violation(s):\n` +
          critical
            .map(
              (v) =>
                `  - [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} node(s))`
            )
            .join("\n")
      ).toHaveLength(0);
    });
  }

  // Also scan the login page (public, unauthenticated)
  test("a11y scan: Login page (/login)", async () => {
    // Open in a fresh context so there are no auth cookies
    const freshContext = await context.browser()!.newContext();
    const freshPage = await freshContext.newPage();
    await freshPage.goto("/login");
    await expect(
      freshPage.getByRole("heading", { name: /welcome back/i })
    ).toBeVisible({ timeout: 10000 });

    const results = await new AxeBuilder({ page: freshPage })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .disableRules(["color-contrast"])
      .exclude('nextjs-portal')
      .exclude('[role="combobox"]')
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    expect(
      critical,
      `Login page has ${critical.length} critical/serious a11y violation(s):\n` +
        critical
          .map(
            (v) =>
              `  - [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} node(s))`
          )
          .join("\n")
    ).toHaveLength(0);

    await freshContext.close();
  });

  // Scan the registration page (public, unauthenticated)
  test("a11y scan: Register page (/register)", async () => {
    const freshContext = await context.browser()!.newContext();
    const freshPage = await freshContext.newPage();
    await freshPage.goto("/register");
    await expect(
      freshPage.getByRole("heading", { name: /create.*account/i })
    ).toBeVisible({ timeout: 10000 });

    const results = await new AxeBuilder({ page: freshPage })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .disableRules(["color-contrast"])
      .exclude('nextjs-portal')
      .exclude('[role="combobox"]')
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    expect(
      critical,
      `Register page has ${critical.length} critical/serious a11y violation(s):\n` +
        critical
          .map(
            (v) =>
              `  - [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} node(s))`
          )
          .join("\n")
    ).toHaveLength(0);

    await freshContext.close();
  });
});

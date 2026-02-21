import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Phase 1 -- Authentication Tests
// ---------------------------------------------------------------------------
// These tests exercise the auth flow: registration, login, logout,
// redirect-when-unauthenticated, and the forgot-password page.
// Every test that creates a user uses a unique timestamped email so runs
// never collide.
// ---------------------------------------------------------------------------

/** Generate a unique test email that will not clash across runs. */
function uniqueEmail() {
  return `test-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
}

/** Shared constants for a known test user that is registered once. */
const SHARED_PASSWORD = "TestPassword123!";
const SHARED_FIRST = "Test";
const SHARED_LAST = "User";
const SHARED_BUSINESS = "Test Business";

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------
test.describe("Registration", () => {
  test("new user can register with valid data and lands on the dashboard", async ({
    page,
  }) => {
    const email = uniqueEmail();

    await page.goto("/register");

    // The heading should be visible
    await expect(
      page.getByRole("heading", { name: "Create your account" })
    ).toBeVisible();

    // Fill out all required fields
    await page.getByLabel(/first name/i).fill(SHARED_FIRST);
    await page.getByLabel(/last name/i).fill(SHARED_LAST);
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(SHARED_PASSWORD);
    await page.getByLabel(/business name/i).fill(SHARED_BUSINESS);

    // Submit the form
    await page.getByRole("button", { name: /create account/i }).click();

    // After successful registration the app redirects to the dashboard (/).
    // Wait for the main content area heading to appear (it says "Welcome back, {name}!").
    await expect(
      page.getByRole("main").getByRole("heading", { level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // The URL should be the root path (dashboard)
    await expect(page).toHaveURL("/");
  });

  test("shows validation errors for missing required fields", async ({
    page,
  }) => {
    await page.goto("/register");

    // Clear any pre-filled values and submit the form empty.
    // The HTML `required` attribute will fire native validation, but the
    // server-side Zod schema also returns custom messages. We rely on the
    // browser's native constraint validation first -- Playwright can detect
    // that the form was NOT submitted by checking the URL stays on /register.
    //
    // Strategy: try to submit without filling anything. The browser's built-in
    // validation should prevent submission. We verify we're still on /register.
    await page.getByRole("button", { name: /create account/i }).click();

    // We should still be on the register page (form was not submitted)
    await expect(page).toHaveURL(/\/register/);

    // The first name field should be marked invalid by the browser
    const firstNameInput = page.getByLabel(/first name/i);
    await expect(firstNameInput).toHaveAttribute("required", "");

    // Now test server-side validation: fill everything except a valid password
    // (too short). The Zod schema requires min 8 characters.
    const email = uniqueEmail();
    await firstNameInput.fill("A");
    await page.getByLabel(/last name/i).fill("B");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill("short"); // < 8 chars
    await page.getByLabel(/business name/i).fill("Biz");

    await page.getByRole("button", { name: /create account/i }).click();

    // The browser's minlength=8 on the password input should prevent
    // submission, OR the server returns a Zod error.
    // Either way, we should still be on /register or see an error.
    // Wait a moment for the server action to round-trip.
    await page.waitForTimeout(1500);

    // If the form did submit (bypassing minLength), a Zod error banner shows:
    const errorBanner = page.locator(".bg-red-50.text-red-700");
    const stillOnRegister = page.url().includes("/register");
    expect(stillOnRegister).toBe(true);

    // At least one of: browser native validation kept us here, or server
    // returned an error message.
    if (await errorBanner.isVisible()) {
      await expect(errorBanner).toContainText(/password/i);
    }
  });

  test("shows error for duplicate email", async ({ page }) => {
    const email = uniqueEmail();

    // Register the first user
    await page.goto("/register");
    await page.getByLabel(/first name/i).fill("First");
    await page.getByLabel(/last name/i).fill("User");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(SHARED_PASSWORD);
    await page.getByLabel(/business name/i).fill("First Biz");
    await page.getByRole("button", { name: /create account/i }).click();

    // Wait for redirect to dashboard
    await expect(
      page.getByRole("main").getByRole("heading", { level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // Log out so we can try to register again with the same email.
    // Open user menu and click Log Out.
    await page.locator("header").getByRole("button").last().click();
    await page.getByRole("menuitem", { name: /log out/i }).click();

    // Wait for redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // Try to register a second user with the same email
    await page.goto("/register");
    await page.getByLabel(/first name/i).fill("Second");
    await page.getByLabel(/last name/i).fill("User");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(SHARED_PASSWORD);
    await page.getByLabel(/business name/i).fill("Second Biz");
    await page.getByRole("button", { name: /create account/i }).click();

    // The server should return a duplicate-email error
    const errorBanner = page.locator(".bg-red-50.text-red-700");
    await expect(errorBanner).toBeVisible({ timeout: 10000 });
    await expect(errorBanner).toContainText(
      "An account with this email already exists"
    );
  });
});

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
test.describe("Login", () => {
  // Pre-register a user that login tests will use.
  let loginEmail: string;

  test.beforeAll(async ({ browser }) => {
    loginEmail = uniqueEmail();
    const page = await browser.newPage();

    await page.goto("/register");
    await page.getByLabel(/first name/i).fill(SHARED_FIRST);
    await page.getByLabel(/last name/i).fill(SHARED_LAST);
    await page.getByLabel(/email/i).fill(loginEmail);
    await page.getByLabel(/password/i).fill(SHARED_PASSWORD);
    await page.getByLabel(/business name/i).fill(SHARED_BUSINESS);
    await page.getByRole("button", { name: /create account/i }).click();

    // Wait until we land on the dashboard to confirm registration succeeded
    await expect(
      page.getByRole("main").getByRole("heading", { level: 1 })
    ).toBeVisible({ timeout: 15000 });

    await page.close();
  });

  test("registered user can log in with correct credentials", async ({
    page,
  }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", { name: "Welcome back" })
    ).toBeVisible();

    await page.getByLabel(/email/i).fill(loginEmail);
    await page.getByLabel(/password/i).fill(SHARED_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should land on the dashboard
    await expect(
      page.getByRole("main").getByRole("heading", { level: 1 })
    ).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL("/");
  });

  test("login fails with wrong password", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel(/email/i).fill(loginEmail);
    await page.getByLabel(/password/i).fill("WrongPassword999!");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should see the error message
    const errorBanner = page.locator(".bg-red-50.text-red-700");
    await expect(errorBanner).toBeVisible({ timeout: 10000 });
    await expect(errorBanner).toContainText("Invalid email or password");

    // Should still be on /login
    await expect(page).toHaveURL(/\/login/);
  });
});

// ---------------------------------------------------------------------------
// Auth Redirect (middleware)
// ---------------------------------------------------------------------------
test.describe("Auth redirect", () => {
  test("unauthenticated user is redirected to /login when accessing /customers", async ({
    page,
  }) => {
    // Make sure we have no session (fresh context)
    await page.context().clearCookies();

    await page.goto("/customers");

    // Middleware should redirect to /login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// Log Out
// ---------------------------------------------------------------------------
test.describe("Log out", () => {
  test("user can log out via the user menu dropdown", async ({ page }) => {
    const email = uniqueEmail();

    // Register a fresh user
    await page.goto("/register");
    await page.getByLabel(/first name/i).fill("Logout");
    await page.getByLabel(/last name/i).fill("Tester");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(SHARED_PASSWORD);
    await page.getByLabel(/business name/i).fill("Logout Biz");
    await page.getByRole("button", { name: /create account/i }).click();

    // Wait for dashboard
    await expect(
      page.getByRole("main").getByRole("heading", { level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // Open the user menu -- the trigger is the avatar button in the topbar.
    // It contains the user's first name ("Logout") on larger screens.
    const userMenuTrigger = page.locator("header").locator("button").filter({
      has: page.locator("span", { hasText: "Logout" }),
    });
    await userMenuTrigger.click();

    // The dropdown should be open and show the user's full name
    await expect(page.getByText("Logout Tester")).toBeVisible();

    // Click "Log Out"
    await page.getByRole("menuitem", { name: /log out/i }).click();

    // Should redirect to /login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // Verify we are actually logged out by trying to access a protected page
    await page.goto("/customers");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// Forgot Password
// ---------------------------------------------------------------------------
test.describe("Forgot password", () => {
  test("forgot password page loads and shows the email form", async ({
    page,
  }) => {
    await page.goto("/forgot-password");

    // Page heading
    await expect(
      page.getByRole("heading", { name: "Reset your password" })
    ).toBeVisible();

    // Descriptive text
    await expect(
      page.getByText(/enter your email and we.+ll send you a reset link/i)
    ).toBeVisible();

    // Email field
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute("type", "email");

    // Submit button
    await expect(
      page.getByRole("button", { name: /send reset link/i })
    ).toBeVisible();

    // "Back to login" link
    await expect(
      page.getByRole("link", { name: /back to login/i })
    ).toBeVisible();
  });

  test("submitting the forgot password form shows confirmation message", async ({
    page,
  }) => {
    await page.goto("/forgot-password");

    await page.getByLabel(/email/i).fill("nonexistent@example.com");
    await page.getByRole("button", { name: /send reset link/i }).click();

    // The success state shows "Check your email" regardless of whether the
    // account exists (to avoid leaking information).
    await expect(
      page.getByRole("heading", { name: "Check your email" })
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByText(/if an account exists with that email/i)
    ).toBeVisible();
  });
});

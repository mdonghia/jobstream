import { type Page, expect } from '@playwright/test';

/**
 * Auth helper functions for E2E tests.
 *
 * These helpers interact with the actual login, registration, and logout
 * flows in the JobStream Next.js app. Selectors are based on the real
 * HTML structure: label associations (htmlFor/id), visible text, and
 * ARIA roles -- no data-testid attributes are used.
 */

interface RegisterUserOptions {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  businessName: string;
}

interface LoginUserOptions {
  email: string;
  password: string;
}

/**
 * Fills out the registration form at /register and submits it.
 *
 * After submission the app redirects to the dashboard on success, so this
 * helper waits for the URL to leave /register before returning.
 */
export async function registerUser(
  page: Page,
  { firstName, lastName, email, password, businessName }: RegisterUserOptions,
) {
  await page.goto('/register');
  await page.waitForLoadState('networkidle');

  // The registration form uses <Label htmlFor="..."> linked to <Input id="...">
  // so page.getByLabel() reliably targets each field.
  await page.getByLabel('First Name').fill(firstName);
  await page.getByLabel('Last Name').fill(lastName);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByLabel('Business Name').fill(businessName);

  // Submit the form by clicking the "Create Account" button.
  await page.getByRole('button', { name: 'Create Account' }).click();

  // Wait for navigation away from /register — the app redirects to the
  // dashboard (/) on successful registration.
  await page.waitForURL((url) => !url.pathname.includes('/register'), {
    timeout: 15000,
  });
}

/**
 * Fills out the login form at /login and submits it.
 *
 * Waits for the page to navigate away from /login after a successful sign-in.
 */
export async function loginUser(
  page: Page,
  { email, password }: LoginUserOptions,
) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);

  await page.getByRole('button', { name: 'Sign In' }).click();

  // The app redirects to the dashboard (/) after successful login.
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 15000,
  });
}

/**
 * Logs the current user out by opening the user menu dropdown in the
 * topbar and clicking "Log Out".
 *
 * The topbar renders an avatar button that toggles a DropdownMenu. The
 * "Log Out" item calls `signOut({ callbackUrl: "/login" })`, so we wait
 * for the redirect to /login.
 */
export async function logout(page: Page) {
  // The user menu trigger is a <button> containing an Avatar and the
  // user's first name. We target the avatar's fallback text (the user's
  // initials) inside the topbar's right-side controls.
  //
  // The topbar avatar is inside a button with class "flex items-center gap-2".
  // We click on the avatar container to open the dropdown.
  const userMenuTrigger = page.locator(
    'header button:has(.h-7.w-7)',
  );
  await userMenuTrigger.click();

  // Wait for the dropdown to appear and click "Log Out".
  await page.getByRole('menuitem', { name: 'Log Out' }).click();

  // The app redirects to /login after signing out.
  await page.waitForURL('**/login', { timeout: 10000 });
}

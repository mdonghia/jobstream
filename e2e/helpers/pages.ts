import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page-object helpers for common UI interactions in JobStream E2E tests.
 *
 * These work with the shadcn/ui component library and the custom DataTable,
 * Sonner toasts, and Command-based combobox patterns used throughout the app.
 */

/**
 * Navigates to the given path and waits for the page to fully load.
 *
 * The path is relative to the baseURL configured in playwright.config.ts
 * (e.g. "/customers", "/jobs/new").
 */
export async function navigateTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

/**
 * Waits for the DataTable to render at least one data row.
 *
 * The DataTable component renders a standard <table> with <tbody> containing
 * <tr> elements for each row. This helper waits until at least one row with
 * actual cell content is visible, which signals that the data has loaded.
 */
export async function waitForTableLoad(page: Page) {
  // The DataTable renders rows inside <tbody>. Each data row contains <td>
  // elements with the class "text-sm text-[#425466]". We wait for at least
  // one such cell to appear, meaning data has been fetched and rendered.
  await page.locator('table tbody tr').first().waitFor({
    state: 'visible',
    timeout: 15000,
  });
}

/**
 * Captures the text content of the most recent toast notification.
 *
 * JobStream uses Sonner (via the <Toaster /> in app/layout.tsx) for toast
 * notifications. Sonner renders toasts inside an <ol> with
 * `data-sonner-toaster` attribute, and each toast is an <li> with
 * `data-sonner-toast` attribute.
 *
 * This helper waits for a toast to appear and returns its visible text.
 */
export async function getToastMessage(page: Page): Promise<string> {
  // Sonner renders each toast as an <li> with the data-sonner-toast attribute.
  const toast = page.locator('[data-sonner-toast]').first();
  await toast.waitFor({ state: 'visible', timeout: 10000 });

  // The toast text is inside a child element with data-content attribute,
  // or we can simply grab all visible text from the toast element.
  const text = await toast.textContent();
  return (text ?? '').trim();
}

/**
 * Interacts with a shadcn/ui combobox (Popover + Command pattern).
 *
 * In JobStream, comboboxes are built with:
 *   <Popover>
 *     <PopoverTrigger asChild>
 *       <Button role="combobox" ...>trigger text</Button>
 *     </PopoverTrigger>
 *     <PopoverContent>
 *       <Command>
 *         <CommandInput placeholder="Search..." />
 *         <CommandList>
 *           <CommandItem>...</CommandItem>
 *         </CommandList>
 *       </Command>
 *     </PopoverContent>
 *   </Popover>
 *
 * This helper:
 *   1. Finds the combobox trigger button near the given label text
 *   2. Clicks it to open the popover
 *   3. Types the search value into the CommandInput
 *   4. Clicks the first matching CommandItem
 *
 * @param page  - The Playwright Page object
 * @param label - The visible label text next to the combobox (e.g. "Customer")
 * @param value - The text to type into the search input and select from results
 */
export async function fillCombobox(
  page: Page,
  label: string,
  value: string,
) {
  // Find the label element, then locate the combobox trigger button that
  // follows it within the same form group container.
  // Labels in JobStream use <Label className="text-sm text-[#425466]"> and
  // the combobox button has role="combobox".
  const formGroup = page.locator(`text="${label}"`).locator('..');
  const trigger = formGroup.locator('[role="combobox"]');
  await trigger.click();

  // The Command popover appears. Type into the search input.
  // CommandInput renders with the data-slot="command-input" attribute.
  const searchInput = page.locator('[data-slot="command-input"]');
  await searchInput.waitFor({ state: 'visible', timeout: 5000 });
  await searchInput.fill(value);

  // Wait a moment for the filtered results to appear, then click the
  // first matching item. CommandItem uses data-slot="command-item".
  const item = page.locator('[data-slot="command-item"]').first();
  await item.waitFor({ state: 'visible', timeout: 5000 });
  await item.click();
}

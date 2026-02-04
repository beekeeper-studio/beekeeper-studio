import { Page } from '@playwright/test';

export const openErdFromTableContextMenu = async (
  page: Page,
  tableName: string
): Promise<void> => {
  // Right-click on the table in the sidebar using exact table name match
  // The button accessible name includes icons, so we use regex to match the exact table name at the end
  const tableButton = page.getByRole('button', { name: new RegExp(`\\s${tableName}$`) });
  await tableButton.click({ button: 'right' });

  // Wait for context menu to appear and be ready
  await page.waitForSelector('.vue-simple-context-menu--active', { timeout: 5000 });

  // Click on the ERD menu item - using getByRole like other context menu tests
  // The menu item should be exactly "View ERD"
  const erdMenuItem = page.getByRole('menuitem', { name: /View ERD/i });
  await erdMenuItem.click();
};

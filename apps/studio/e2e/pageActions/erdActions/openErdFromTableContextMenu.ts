import { Page } from '@playwright/test';

export const openErdFromTableContextMenu = async (
  page: Page,
  tableName: string
): Promise<void> => {
  // Right-click on the table in the sidebar
  // The button includes icon text like "keyboard_arrow_right grid_on actor"
  // Use exact match with the full accessible name to avoid matching similar names
  const tableButton = page.getByRole('button', {
    name: `keyboard_arrow_right grid_on ${tableName}`,
    exact: true
  });

  // Wait for the button to be available
  await tableButton.waitFor({ state: 'visible', timeout: 5000 });

  // Ensure the element is visible and in view
  await tableButton.scrollIntoViewIfNeeded();

  // Wait for any animations/transitions to complete and element to be stable
  await page.waitForTimeout(500);

  // Get the bounding box to position the mouse explicitly
  const boundingBox = await tableButton.boundingBox();
  if (!boundingBox) {
    throw new Error(`Could not get bounding box for table "${tableName}"`);
  }

  // Calculate center position of the element
  const x = boundingBox.x + boundingBox.width / 2;
  const y = boundingBox.y + boundingBox.height / 2;

  // Explicitly move the virtual mouse to the center of the element
  await page.mouse.move(x, y);

  // Small delay to ensure mouse position is registered
  await page.waitForTimeout(100);

  // Right-click using the mouse API
  await page.mouse.click(x, y, { button: 'right' });

  // Click the "View ERD" menu item
  const erdMenuItem = page.getByRole('listitem').filter({ hasText: 'View ERD' });
  await erdMenuItem.click();

  console.log('ERD CLICKED', erdMenuItem)
};

// Copyright (c) 2026 Beekeeper Studio Team
// For support issues with this feature, contact @quinnjr on GitHub

import { Page } from '@playwright/test';

export const openMigrationTab = async (page: Page): Promise<void> => {
  // Open Tools menu and click on Server to Server Migration
  await page.click('[aria-label="Tools"]');
  await page.click('text=Server to Server Migration');
};

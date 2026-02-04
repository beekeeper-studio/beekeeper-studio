import { Page } from '@playwright/test';

export const waitForErdPluginToLoad = async (page: Page): Promise<void> => {
  // Wait for the ERD plugin to:
  // 1. Be downloaded/installed (if first run)
  // 2. Be loaded by the plugin manager
  // 3. Register its menu items in the popup menu store

  await page.waitForFunction(
    () => {
      // Access the Vuex store via window
      const store = (window as any).$store;
      if (!store) return false;

      // Check if entity.table menu has any extra items (from plugins)
      const extraMenu = store.state?.popupMenu?.extraPopupMenu?.['entity.table'];

      // Look for ERD-related menu item specifically
      if (extraMenu && extraMenu.length > 0) {
        // Check if any menu item is related to ERD/diagram
        const hasErdItem = extraMenu.some((item: any) =>
          item.name?.toLowerCase().includes('diagram') ||
          item.name?.toLowerCase().includes('erd') ||
          item.slug?.includes('erd') ||
          item.slug?.includes('diagram')
        );
        return hasErdItem;
      }

      return false;
    },
    { timeout: 30000 } // 30 second timeout - plugin may need to download on first run
  );
};

import { Page } from '@playwright/test';

export const debugPluginState = async (page: Page): Promise<void> => {
  const pluginInfo = await page.evaluate(() => {
    const store = (window as any).$store;

    return {
      hasStore: !!store,
      popupMenuState: store?.state?.popupMenu?.extraPopupMenu || {},
      allPopupMenuKeys: Object.keys(store?.state?.popupMenu?.extraPopupMenu || {}),
      entityTableMenu: store?.state?.popupMenu?.extraPopupMenu?.['entity.table'] || [],
    };
  });

  console.log('=== Plugin Debug Info ===');
  console.log('Has Vuex Store:', pluginInfo.hasStore);
  console.log('Popup Menu Keys:', pluginInfo.allPopupMenuKeys);
  console.log('Entity Table Menu Items:', pluginInfo.entityTableMenu);
  console.log('========================');
};

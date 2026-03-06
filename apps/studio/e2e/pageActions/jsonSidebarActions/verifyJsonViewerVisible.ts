import { JsonSidebar } from '../../pageComponents/JsonSidebar';
import { expect } from '@playwright/test';

export const verifyJsonViewerVisible = async (jsonSidebar: JsonSidebar): Promise<void> => {
  await expect(jsonSidebar.jsonViewerLabel).toBeVisible({ timeout: 10000 });
};

import { Page } from '@playwright/test';
import { JsonSidebar } from '../../pageComponents/JsonSidebar';
import { verifyJsonViewerVisible } from './verifyJsonViewerVisible';

export const userActions = (page: Page) => {
  const jsonSidebar = new JsonSidebar(page);

  return {
    verifyJsonViewerVisible: () => verifyJsonViewerVisible(jsonSidebar),
  };
};

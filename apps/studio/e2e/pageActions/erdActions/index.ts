import { Page } from '@playwright/test';
import { EntityRelationshipDiagram } from '../../pageComponents/EntityRelationshipDiagram';
import { openErdFromTableContextMenu } from './openErdFromTableContextMenu';
import { waitForErdPluginToLoad } from './waitForErdPluginToLoad';
import { debugPluginState } from './debugPluginState';

export const userActions = (page: Page) => {
  const erd = new EntityRelationshipDiagram(page);

  return {
    openErdFromTableContextMenu: (tableName: string) =>
      openErdFromTableContextMenu(page, tableName),
    waitForErdPluginToLoad: () => waitForErdPluginToLoad(page),
    debugPluginState: () => debugPluginState(page),
    erd
  };
};

import { Page } from '@playwright/test';
import { EntityRelationshipDiagram } from '../../pageComponents/EntityRelationshipDiagram';
import { openErdFromTableContextMenu } from './openErdFromTableContextMenu';
import { waitForErdPluginToLoad } from './waitForErdPluginToLoad';
import { debugPluginState } from './debugPluginState';
import { verifyErdTabVisible } from './verifyErdTabVisible';
import { verifyErdIframeLoaded } from './verifyErdIframeLoaded';
import { verifyActorTableInErd } from './verifyActorTableInErd';
import { verifySchemaInErd } from './verifySchemaInErd';

export const userActions = (page: Page) => {
  const erd = new EntityRelationshipDiagram(page);

  return {
    openErdFromTableContextMenu: (tableName: string) =>
      openErdFromTableContextMenu(page, tableName),
    waitForErdPluginToLoad: () => waitForErdPluginToLoad(page),
    debugPluginState: () => debugPluginState(page),
    verifyErdTabVisible: () => verifyErdTabVisible(erd),
    verifyErdIframeLoaded: () => verifyErdIframeLoaded(erd),
    verifyActorTableInErd: () => verifyActorTableInErd(erd),
    verifySchemaInErd: () => verifySchemaInErd(erd),
  };
};

import { EntityRelationshipDiagram } from '../../pageComponents/EntityRelationshipDiagram';
import { expect } from '@playwright/test';

export const verifyErdIframeLoaded = async (erd: EntityRelationshipDiagram): Promise<void> => {
  await expect(erd.erdIframe).toBeVisible({ timeout: 10000 });
};

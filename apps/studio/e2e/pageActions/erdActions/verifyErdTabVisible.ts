import { EntityRelationshipDiagram } from '../../pageComponents/EntityRelationshipDiagram';
import { expect } from '@playwright/test';

export const verifyErdTabVisible = async (erd: EntityRelationshipDiagram): Promise<void> => {
  await expect(erd.erdTabHeader).toBeVisible({ timeout: 10000 });
};

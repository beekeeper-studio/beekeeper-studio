import { EntityRelationshipDiagram } from '../../pageComponents/EntityRelationshipDiagram';
import { expect } from '@playwright/test';

export const verifySchemaInErd = async (erd: EntityRelationshipDiagram): Promise<void> => {
  const schemaText = await erd.schemaText();
  await expect(schemaText).toBeVisible({ timeout: 10000 });
};

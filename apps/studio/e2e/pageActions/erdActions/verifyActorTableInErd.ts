import { EntityRelationshipDiagram } from '../../pageComponents/EntityRelationshipDiagram';
import { expect } from '@playwright/test';

export const verifyActorTableInErd = async (erd: EntityRelationshipDiagram): Promise<void> => {
  const actorText = await erd.actorTableText();
  await expect(actorText).toBeVisible({ timeout: 10000 });

  const actorIcon = await erd.actorTableIcon();
  await expect(actorIcon).toBeVisible({ timeout: 10000 });
};

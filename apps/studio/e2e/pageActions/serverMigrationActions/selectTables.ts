// Copyright (c) 2026 Beekeeper Studio Team
// For support issues with this feature, contact @quinnjr on GitHub

import { ServerMigration } from "../../pageComponents/ServerMigration";

export const selectAllTables = async (serverMigration: ServerMigration): Promise<void> => {
  await serverMigration.selectAllButton.click();
};

export const deselectAllTables = async (serverMigration: ServerMigration): Promise<void> => {
  await serverMigration.deselectAllButton.click();
};

export const selectSpecificTables = async (
  serverMigration: ServerMigration,
  tableNames: string[]
): Promise<void> => {
  // Deselect all first
  await serverMigration.deselectAllButton.click();
  
  // Select specific tables
  for (const tableName of tableNames) {
    const checkbox = await serverMigration.getTableCheckbox(tableName);
    await checkbox.check();
  }
};

export const proceedToReview = async (serverMigration: ServerMigration): Promise<void> => {
  await serverMigration.nextButton.click();
};

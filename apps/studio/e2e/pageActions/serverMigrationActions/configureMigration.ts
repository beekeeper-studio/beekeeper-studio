// Copyright (c) 2026 Beekeeper Studio Team
// For support issues with this feature, contact @quinnjr on GitHub

import { ServerMigration } from "../../pageComponents/ServerMigration";

export interface MigrationConfig {
  sourceConnection: string;
  targetConnection: string;
  migrationType?: 'schema_and_data' | 'schema_only' | 'data_only';
  dropExisting?: boolean;
  disableForeignKeys?: boolean;
  batchSize?: number;
}

export const configureMigration = async (
  serverMigration: ServerMigration,
  config: MigrationConfig
): Promise<void> => {
  // Select source connection
  await serverMigration.sourceConnectionSelect.selectOption(config.sourceConnection);
  
  // Select target connection
  await serverMigration.targetConnectionSelect.selectOption(config.targetConnection);
  
  // Select migration type if specified
  if (config.migrationType) {
    await serverMigration.migrationTypeSelect.selectOption(config.migrationType);
  }
  
  // Set drop existing option
  if (config.dropExisting !== undefined) {
    if (config.dropExisting) {
      await serverMigration.dropExistingCheckbox.check();
    } else {
      await serverMigration.dropExistingCheckbox.uncheck();
    }
  }
  
  // Set disable foreign keys option
  if (config.disableForeignKeys !== undefined) {
    if (config.disableForeignKeys) {
      await serverMigration.disableForeignKeysCheckbox.check();
    } else {
      await serverMigration.disableForeignKeysCheckbox.uncheck();
    }
  }
  
  // Set batch size if specified
  if (config.batchSize) {
    await serverMigration.batchSizeInput.fill(config.batchSize.toString());
  }
  
  // Click next to proceed to table selection
  await serverMigration.nextButton.click();
};

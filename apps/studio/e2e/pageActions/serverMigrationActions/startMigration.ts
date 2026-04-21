// Copyright (c) 2026 Beekeeper Studio Team
// For support issues with this feature, contact @quinnjr on GitHub

import { ServerMigration } from "../../pageComponents/ServerMigration";

export const reviewAndStart = async (serverMigration: ServerMigration): Promise<void> => {
  // Wait for review container to be visible
  await serverMigration.reviewContainer.waitFor({ state: 'visible' });
  
  // Click the start/finish button
  await serverMigration.startMigrationButton.click();
};

export const waitForCompletion = async (serverMigration: ServerMigration): Promise<void> => {
  await serverMigration.waitForMigrationComplete();
};

export const cancelMigration = async (serverMigration: ServerMigration): Promise<void> => {
  await serverMigration.cancelButton.click();
};

export const closeMigration = async (serverMigration: ServerMigration): Promise<void> => {
  await serverMigration.closeButton.click();
};

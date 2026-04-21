// Copyright (c) 2026 Beekeeper Studio Team
// For support issues with this feature, contact @quinnjr on GitHub

import { Locator, Page } from '@playwright/test';

export class ServerMigration {
  private page: Page;
  
  // Migration tab button in Tools menu
  migrationMenuItem: Locator;
  
  // Configuration step
  sourceConnectionSelect: Locator;
  targetConnectionSelect: Locator;
  migrationTypeSelect: Locator;
  dropExistingCheckbox: Locator;
  disableForeignKeysCheckbox: Locator;
  batchSizeInput: Locator;
  
  // Table selection step
  selectAllButton: Locator;
  deselectAllButton: Locator;
  tableCheckboxes: Locator;
  
  // Stepper navigation
  nextButton: Locator;
  backButton: Locator;
  startMigrationButton: Locator;
  
  // Progress
  progressContainer: Locator;
  progressBar: Locator;
  tablesCompletedStat: Locator;
  rowsMigratedStat: Locator;
  cancelButton: Locator;
  closeButton: Locator;
  
  // Review
  reviewContainer: Locator;
  
  constructor(page: Page) {
    this.page = page;
    
    // Menu
    this.migrationMenuItem = this.page.getByRole('menuitem', { name: /server.*migration/i });
    
    // Configuration
    this.sourceConnectionSelect = this.page.locator('#sourceConnection');
    this.targetConnectionSelect = this.page.locator('#targetConnection');
    this.migrationTypeSelect = this.page.locator('#migrationType');
    this.dropExistingCheckbox = this.page.locator('#dropExisting');
    this.disableForeignKeysCheckbox = this.page.locator('#disableForeignKeys');
    this.batchSizeInput = this.page.locator('#batchSize');
    
    // Table selection
    this.selectAllButton = this.page.getByRole('button', { name: /select all/i });
    this.deselectAllButton = this.page.getByRole('button', { name: /deselect all/i });
    this.tableCheckboxes = this.page.locator('.table-item input[type="checkbox"]');
    
    // Stepper
    this.nextButton = this.page.getByRole('button', { name: /next/i });
    this.backButton = this.page.getByRole('button', { name: /back/i });
    this.startMigrationButton = this.page.getByRole('button', { name: /start|finish/i });
    
    // Progress
    this.progressContainer = this.page.locator('.migration-progress');
    this.progressBar = this.page.locator('.progress-bar .progress-fill');
    this.tablesCompletedStat = this.page.locator('.stat-card').filter({ hasText: /tables completed/i });
    this.rowsMigratedStat = this.page.locator('.stat-card').filter({ hasText: /rows migrated/i });
    this.cancelButton = this.page.getByRole('button', { name: /cancel/i });
    this.closeButton = this.page.getByRole('button', { name: /close/i });
    
    // Review
    this.reviewContainer = this.page.locator('.migration-review');
  }
  
  async getTableCheckbox(tableName: string): Promise<Locator> {
    return this.page.locator('.table-item').filter({ hasText: tableName }).locator('input[type="checkbox"]');
  }
  
  async waitForMigrationComplete(): Promise<void> {
    await this.page.waitForSelector('.status-message.success', { timeout: 60000 });
  }
}

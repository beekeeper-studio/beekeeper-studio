import { _electron as electron } from 'playwright';
import { test, expect, beforeEach, afterEach } from '@playwright/test';
import { QueryTab } from '../pageComponents/QueryTab';
import { EntityRelationshipDiagram } from '../pageComponents/EntityRelationshipDiagram';
import { userActions } from "../pageActions/index";
import { POSTGRES_CONFIG } from './config/postgresDbConfig';

let electronApp;
let window;
let queryTab;
let erd;
let userAttemptsTo;

test.describe.only("ERD (Entity Relationship Diagram) Feature", () => {
  beforeEach(async () => {
    electronApp = await electron.launch({
      args: ['dist/main.js'],
      env: {
        ...process.env,
        // Don't set TEST_MODE - it causes config path issues
        // TEST_MODE resolves config to monorepo root, but files are in apps/studio/
      },
    });
    window = await electronApp.firstWindow();
    queryTab = new QueryTab(window);
    erd = new EntityRelationshipDiagram(window);
    userAttemptsTo = userActions(window);
    
    // Connect to PostgreSQL test database
    await userAttemptsTo.selectNewConnection(POSTGRES_CONFIG.connectionType);
    await userAttemptsTo.insertDatabaseDetails(POSTGRES_CONFIG);
    await userAttemptsTo.connectWithDatabase();

    // Wait for connection to be established
    await expect(queryTab.queryTabTextArea).toBeVisible();

    // // Debug: Check plugin state
    // console.log('Before waiting for plugin:');
    // await userAttemptsTo.debugPluginState();

    // // Wait for ERD plugin to fully load and register menu items
    // await userAttemptsTo.waitForErdPluginToLoad();

    // console.log('After plugin loaded:');
    // await userAttemptsTo.debugPluginState();
  });

  afterEach(async () => {
    await electronApp.close();
  });

  test("user can access ERD from table context menu", async () => {
    // Right-click on 'actor' table in sidebar and select ERD option
    await userAttemptsTo.openErdFromTableContextMenu('actor');

    // Verify ERD tab is opened
    await expect(erd.erdTab).toBeVisible({ timeout: 10000 });
  });

  test("ERD tab appears in tab list", async () => {
    // Open ERD from table context menu
    await userAttemptsTo.openErdFromTableContextMenu('actor');

    // Verify ERD tab header is visible
    const tabHeader = await erd.erdTabHeader();
    await expect(tabHeader).toBeVisible({ timeout: 10000 });
  });
});

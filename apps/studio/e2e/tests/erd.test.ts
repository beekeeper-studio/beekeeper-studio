import { _electron as electron } from 'playwright';
import { test, expect, beforeEach, afterEach } from '@playwright/test';
import { QueryTab } from '../pageComponents/QueryTab';
import { userActions } from "../pageActions/index";
import { POSTGRES_CONFIG } from './config/postgresDbConfig';

let electronApp;
let window;
let queryTab;
let userAttemptsTo;

test.describe("ERD (Entity Relationship Diagram) Feature", () => {
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
    userAttemptsTo = userActions(window);
    
    // Connect to PostgreSQL test database
    await userAttemptsTo.selectNewConnection(POSTGRES_CONFIG.connectionType);
    await userAttemptsTo.insertDatabaseDetails(POSTGRES_CONFIG);
    await userAttemptsTo.connectWithDatabase();

    // Wait for connection to be established
    await expect(queryTab.queryTabTextArea).toBeVisible();

  });

  afterEach(async () => {
    await electronApp.close();
  });

  test("user can access ERD from table context menu", async () => {
    // Right-click on 'actor' table in sidebar and select ERD option
    await userAttemptsTo.openErdFromTableContextMenu('actor');

    // Verify ERD tab header appears
    await userAttemptsTo.verifyErdTabVisible();

    // Verify ERD iframe is loaded
    await userAttemptsTo.verifyErdIframeLoaded();

    // Verify actor table is displayed in the ERD
    await userAttemptsTo.verifyActorTableInErd();
  });

  test("ERD shows table structure and relationships", async () => {
    // Open ERD from table context menu
    await userAttemptsTo.openErdFromTableContextMenu('actor');

    // Verify ERD tab is visible
    await userAttemptsTo.verifyErdTabVisible();

    // Verify ERD iframe is loaded
    await userAttemptsTo.verifyErdIframeLoaded();

    // Verify actor table is displayed
    await userAttemptsTo.verifyActorTableInErd();

    // Verify schema is visible
    await userAttemptsTo.verifySchemaInErd();
  });
});

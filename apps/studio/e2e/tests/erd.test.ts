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

    // Wait for ERD plugin to fully load and register menu items
    await userAttemptsTo.waitForErdPluginToLoad();
  });

  afterEach(async () => {
    await electronApp.close();
  });

  test("user can access ERD from table context menu", async () => {
    // Right-click on 'actor' table in sidebar and select ERD option
    await userAttemptsTo.openErdFromTableContextMenu('actor');

    // Verify ERD tab header appears (text like "actor - ERD")
    const tabHeader = await erd.erdTabHeader();
    await expect(tabHeader).toBeVisible({ timeout: 10000 });

    // Verify ERD iframe is loaded inside the tab
    await expect(erd.erdIframe).toBeVisible({ timeout: 10000 });
  });

  test("ERD tab shows schema content", async () => {
    // Open ERD from table context menu
    await userAttemptsTo.openErdFromTableContextMenu('actor');

    // Verify ERD tab is visible
    await expect(erd.erdTab).toBeVisible({ timeout: 10000 });

    // Verify iframe is loaded
    await expect(erd.erdIframe).toBeVisible({ timeout: 10000 });

    // Get the iframe content and verify schema elements exist
    const iframe = erd.erdIframe;
    const frameContent = await iframe.contentFrame();

    // Verify the schema folder/structure is visible in the ERD
    // Based on recording: "folderpublic" text appears in the ERD
    await expect(frameContent.getByText(/folder|public|schema/i)).toBeVisible({ timeout: 10000 });
  });
});

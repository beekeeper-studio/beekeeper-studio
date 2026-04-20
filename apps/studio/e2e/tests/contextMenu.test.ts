import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { QueryTab } from '../pageComponents/QueryTab';
import { userActions } from "../pageActions/index";
import { POSTGRES_CONFIG } from './config/postgresDbConfig';
import { launchElectron } from 'e2e/helpers/launchElectron';

const POSTGRES_QUERY = 'SELECT * FROM actor WHERE actor_id IN (1, 2);';

let electronApp: ElectronApplication;
let window: Page;
let queryTab: QueryTab;
let userAttemptsTo: any;

test.describe("Using the context menu", () => {

    test.beforeEach(async () => {
        electronApp = await launchElectron();
        window = await electronApp.firstWindow();
        queryTab = new QueryTab(window);
        userAttemptsTo = userActions(window);


        await userAttemptsTo.selectNewConnection(POSTGRES_CONFIG.connectionType);
        await userAttemptsTo.insertDatabaseDetails(POSTGRES_CONFIG);
        await userAttemptsTo.connectWithDatabase();

        await expect(queryTab.queryTabTextArea).toBeVisible();
    });

    test.afterEach(async () => {
        if (electronApp) {
            await electronApp.close();
        }
    });

    test("paste a query using context menu", async () => {
      // adding a default text to be asserted later
      await window.evaluate((clipboardText) => navigator.clipboard.writeText(clipboardText), POSTGRES_QUERY);

      await queryTab.queryTabTextArea.click({
        button: 'right'
      });

      await window.getByRole('menuitem', { name: 'Paste' }).click();
      const queryTabText = await queryTab.queryTabTextArea.innerText();
      expect(queryTabText).toContain(POSTGRES_QUERY);
    });

    test("paste a password using context menu", async () => {
      // adding a default text to be asserted later
      await window.evaluate((clipboardText) => navigator.clipboard.writeText(clipboardText), POSTGRES_QUERY);

      await queryTab.queryTabTextArea.click({
        button: 'right'
      });

      await window.getByRole('menuitem', { name: 'Paste' }).click();
      const queryTabText = await queryTab.queryTabTextArea.innerText();
      expect(queryTabText).toContain(POSTGRES_QUERY);
    });
});

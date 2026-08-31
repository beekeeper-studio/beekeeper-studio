import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { QueryTab } from '../pageComponents/QueryTab';
import { userActions } from "../pageActions/index";
import { POSTGRES_CONFIG } from './config/postgresDbConfig';
import { launchElectron } from 'e2e/helpers/launchElectron';

const POSTGRES_QUERY = 'SELECT * FROM actor WHERE actor_id IN (1, 2);';

let electronApp: ElectronApplication;
let win: Page;
let queryTab: QueryTab;
let userAttemptsTo: any;

test.describe("Using the context menu", () => {

    test.beforeEach(async () => {
        electronApp = await launchElectron();
        win = await electronApp.firstWindow();
        queryTab = new QueryTab(win);
        userAttemptsTo = userActions(win);


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
      await win.evaluate((clipboardText) => window.main.writeTextToClipboard(clipboardText), POSTGRES_QUERY);

      await queryTab.queryTabTextArea.click({
        button: 'right'
      });

      await win.getByRole('menuitem', { name: 'Paste' }).click();
      const queryTabText = await queryTab.queryTabTextArea.innerText();
      expect(queryTabText).toContain(POSTGRES_QUERY);
    });
});

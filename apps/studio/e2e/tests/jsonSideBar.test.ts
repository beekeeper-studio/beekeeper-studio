import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { QueryResultPane } from '../pageComponents/QueryResultPane';
import { QueryTab } from '../pageComponents/QueryTab';
import { userActions } from "../pageActions/index";
import { POSTGRES_CONFIG } from './config/postgresDbConfig';
import { launchElectron } from 'e2e/helpers/launchElectron';

const POSTGRES_QUERY = 'SELECT * FROM actor WHERE actor_id IN (1, 2);';

let electronApp: ElectronApplication;
let window: Page;
let queryTab: QueryTab;
let resultPane: QueryResultPane;
let userAttemptsTo: any;

test.describe("JSON Sidebar Verifications", () => {

    test.beforeEach(async () => {
        electronApp = await launchElectron();
        window = await electronApp.firstWindow();
        queryTab = new QueryTab(window);
        resultPane = new QueryResultPane(window);
        userAttemptsTo = userActions(window);


        await userAttemptsTo.selectNewConnection(POSTGRES_CONFIG.connectionType);
        await userAttemptsTo.insertDatabaseDetails(POSTGRES_CONFIG);
        await userAttemptsTo.connectWithDatabase();

        await expect(queryTab.queryTabTextArea).toBeVisible();
        await userAttemptsTo.writeAQuery(POSTGRES_QUERY);
        await userAttemptsTo.runQuery();
        await expect(resultPane.resultSecondRow).toBeVisible();
    });

    test.afterEach(async () => {
        if (electronApp) {
            await electronApp.close();
        }
    });

    test.skip("accessing the JSON sidebar", async () => {

      await userAttemptsTo.toggleLeftSideBar();

      // need to deal with the free trial modal
      // await window.getByText('Start Free Trial').click();
      // await window.getByRole('button', { name: 'more_vert' }).click();
      // need to create the JSON SideBar files, but since we won't be activating this test now...
      const jsonSideBar = window.locator('[contenteditable="true"][role="textbox"]');
      await expect(jsonSideBar).toBeVisible();
    });
});

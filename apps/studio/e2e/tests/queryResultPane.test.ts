import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { QueryTab } from '../pageComponents/QueryTab';
import { QueryResultPane } from '../pageComponents/QueryResultPane';
import { userActions } from "../pageActions/index";
import { POSTGRES_CONFIG } from './config/postgresDbConfig';
import { launchElectron } from 'e2e/helpers/launchElectron';

const POSTGRES_QUERY = 'SELECT * FROM actor WHERE actor_id IN (1, 2);';

let electronApp: ElectronApplication;
let window: Page;
let queryTab: QueryTab;
let resultPane: QueryResultPane;
let userAttemptsTo: any;

test.describe("Result Pane Verifications", () => {

    test.beforeEach(async () => {
        electronApp = await launchElectron();
        window = await electronApp.firstWindow();
        queryTab = new QueryTab(window);
        resultPane = new QueryResultPane(window);
        userAttemptsTo = userActions(window);
    });

    test.afterEach(async () => {
        if (electronApp) {
            await electronApp.close();
        }
    });

    test("clicks on results columns", async () => {

        await userAttemptsTo.selectNewConnection(POSTGRES_CONFIG.connectionType);
        await userAttemptsTo.insertDatabaseDetails(POSTGRES_CONFIG);
        await userAttemptsTo.connectWithDatabase();

        await expect(queryTab.queryTabTextArea).toBeVisible();
        await userAttemptsTo.writeAQuery(POSTGRES_QUERY);
        await userAttemptsTo.runQuery();
        await expect(resultPane.resultSecondRow).toBeVisible();
        // will move this to an action
        await userAttemptsTo.clickOnFirstColumnHeader();
        await expect(resultPane.firstColumnHeader).toBeVisible();
    });

    test("reorders items by clicking", async () => {

        await userAttemptsTo.selectNewConnection(POSTGRES_CONFIG.connectionType);
        await userAttemptsTo.insertDatabaseDetails(POSTGRES_CONFIG);
        await userAttemptsTo.connectWithDatabase();

        await expect(queryTab.queryTabTextArea).toBeVisible();
        await userAttemptsTo.writeAQuery(POSTGRES_QUERY);
        await userAttemptsTo.runQuery();
        await expect(resultPane.resultSecondRow).toBeVisible();

        // clicking twice due to a bug (will be reported)
        await userAttemptsTo.clickOnFirstColumnHeader();

        const cellValueBeforeReordering = await resultPane.firstItemAndFirstColumn.textContent()
        await expect(resultPane.firstItemAndFirstColumn).toBeVisible();
        await userAttemptsTo.clickOnFirstColumnHeader();
        const cellValueAfterReordering = await resultPane.firstItemAndFirstColumn.textContent();

        await expect(resultPane.resultFirstRow).toBeVisible();
        expect(cellValueBeforeReordering).not.toBe(cellValueAfterReordering);
    });
});

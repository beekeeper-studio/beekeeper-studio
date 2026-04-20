import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { QueryTab } from '../pageComponents/QueryTab';
import { QueryResultPane } from '../pageComponents/QueryResultPane';
import { userActions } from "../pageActions/index";
import { POSTGRES_CONFIG } from './config/postgresDbConfig';
import { launchElectron } from 'e2e/helpers/launchElectron';

let electronApp: ElectronApplication;
let window: Page;
let queryTab: QueryTab;
let resultPane: QueryResultPane;
let userAttemptsTo: any;
const testQueryPrefix = `SELECT * FROM actor`;

test.describe("Postgres query execution", () => {

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

    test("perform a Postgres query", async () => {
        const postgresQuery = `${testQueryPrefix} limit 1;`;

        await userAttemptsTo.selectNewConnection(POSTGRES_CONFIG.connectionType);
        await userAttemptsTo.insertDatabaseDetails(POSTGRES_CONFIG);
        await userAttemptsTo.connectWithDatabase();

        await expect(queryTab.queryTabTextArea).toBeVisible();

        await userAttemptsTo.writeAQuery(postgresQuery);
        await userAttemptsTo.runQuery();

        await expect(resultPane.resultFirstRow).toBeVisible();
    });

    test("postgres query with WHERE and 2 results", async () => {
        const queryWithConditionals = `${testQueryPrefix} WHERE actor_id IN (1, 2);`

        await userAttemptsTo.selectNewConnection(POSTGRES_CONFIG.connectionType);
        await userAttemptsTo.insertDatabaseDetails(POSTGRES_CONFIG);
        await userAttemptsTo.connectWithDatabase();

        await expect(queryTab.queryTabTextArea).toBeVisible();

        await userAttemptsTo.writeAQuery(queryWithConditionals);
        await userAttemptsTo.runQuery();

        await expect(resultPane.resultFirstRow).toBeVisible();
        await expect(resultPane.resultSecondRow).toBeVisible();
        await expect(resultPane.resultThridRow).not.toBeVisible();
    });

    test("runs valid query with no results", async () => {
        const zeroResultsQuery = `${testQueryPrefix} actor WHERE actor_id = null;`

        await userAttemptsTo.selectNewConnection(POSTGRES_CONFIG.connectionType);
        await userAttemptsTo.insertDatabaseDetails(POSTGRES_CONFIG);
        await userAttemptsTo.connectWithDatabase();

        await expect(queryTab.queryTabTextArea).toBeVisible();

        await userAttemptsTo.writeAQuery(zeroResultsQuery);
        await userAttemptsTo.runQuery();

        await expect(resultPane.resultFirstRow).not.toBeVisible();
        await expect(resultPane.resultSecondRow).not.toBeVisible();
        await expect(resultPane.resultThridRow).not.toBeVisible();
        await expect(resultPane.noResults).toBeVisible();
    });

});

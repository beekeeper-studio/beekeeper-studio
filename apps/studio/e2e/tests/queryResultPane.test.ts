import { _electron as electron } from 'playwright';
import { test, expect, beforeEach, afterEach } from '@playwright/test';
import { NewDatabaseConnection } from '../pageComponents/NewDatabaseConnection';
import { QueryTab } from '../pageComponents/QueryTab';
import { QueryResultPane } from '../pageComponents/QueryResultPane';
import { userActions } from "../pageActions/index";

const POSTGRES_USER = 'postgres';
const POSTGRES_PASSWRD = 'T@est1234';
const POSTGRES_DEFAULT_DB = 'test_beekeeper';
const POSTGRES_QUERY = 'SELECT * FROM test_load WHERE id IN (1, 2);';
const CONNECTION_TYPE = 'Postgres';

let electronApp;
let window;
let queryTab;
let resultPane;
let userAttemptsTo;
let newDatabaseConnection;
let connectionObj;
test.describe("Result Pane Verifications", () => {

    beforeEach(async () => {
        electronApp = await electron.launch({ args: ['dist/main.js'] });
        window = await electronApp.firstWindow();
        newDatabaseConnection = new NewDatabaseConnection(window);
        queryTab = new QueryTab(window);
        resultPane = new QueryResultPane(window);
        userAttemptsTo = userActions(window);
        connectionObj = {
            databaseUser: POSTGRES_USER,
            databasePassword: POSTGRES_PASSWRD,
            defaultDatabase: POSTGRES_DEFAULT_DB
        }
    });

    afterEach(async () => {
        await electronApp.close();
    });

    test("clicks on results columns", async () => {

        await userAttemptsTo.selectNewConnection(CONNECTION_TYPE);
        await userAttemptsTo.insertDatabaseDetails(connectionObj);
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

        await userAttemptsTo.selectNewConnection(CONNECTION_TYPE);
        await userAttemptsTo.insertDatabaseDetails(connectionObj);
        await userAttemptsTo.connectWithDatabase();

        await expect(queryTab.queryTabTextArea).toBeVisible();
        await userAttemptsTo.writeAQuery(POSTGRES_QUERY);
        await userAttemptsTo.runQuery();
        await expect(resultPane.resultSecondRow).toBeVisible();

        // clicking twice due to a bug (will be reported) 
        await userAttemptsTo.clickOnFirstColumnHeader();

        const cellValueBeforeReordering = await resultPane.firstItemAndFirstColumn.textContent()
        await expect(await resultPane.firstItemAndFirstColumn).toBeVisible();
        await userAttemptsTo.clickOnFirstColumnHeader();
        const cellValueAfterReordering = await resultPane.firstItemAndFirstColumn.textContent();

        await expect(resultPane.resultFirstRow).toBeVisible();
        await expect(cellValueBeforeReordering).not.toBe(cellValueAfterReordering);
    });
});

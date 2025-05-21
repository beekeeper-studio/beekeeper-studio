import { _electron as electron } from 'playwright';
import { test, expect, beforeEach, afterEach } from '@playwright/test';
import { NewDatabaseConnection } from '../pageComponents/NewDatabaseConnection';
import { QueryTab } from '../pageComponents/QueryTab';
import { QueryResultPane } from '../pageComponents/QueryResultPane';
import { userActions } from "../pageActions/index";
import { POSTGRES_CONFIG } from './config/postgresDbConfig';

let electronApp;
let window;
let queryTab;
let resultPane;
let userAttemptsTo;
let newDatabaseConnection;

test.describe("Postgres query execution", () => {

    beforeEach(async () => {
        electronApp = await electron.launch({ args: ['dist/main.js'] });
        window = await electronApp.firstWindow();
        newDatabaseConnection = new NewDatabaseConnection(window);
        queryTab = new QueryTab(window);
        resultPane = new QueryResultPane(window);
        userAttemptsTo = userActions(window);
    });

    afterEach(async () => {
        await electronApp.close();
    });

    test("perform a Postgres query", async () => {
        const postgresQuery = 'select * from test_load limit 1;';

        await userAttemptsTo.selectNewConnection(POSTGRES_CONFIG.connectionType);
        await userAttemptsTo.insertDatabaseDetails(POSTGRES_CONFIG);
        await userAttemptsTo.connectWithDatabase();

        await expect(queryTab.queryTabTextArea).toBeVisible();

        await userAttemptsTo.writeAQuery(postgresQuery);
        await userAttemptsTo.runQuery();

        await expect(resultPane.resultFirstRow).toBeVisible();
    });

    test("postgres query with WHERE and 2 results", async () => {
        const queryWithConditionals = 'SELECT * FROM test_load WHERE id IN (1, 2);'

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
        const zeroResultsQuery = 'SELECT * FROM test_load WHERE id = null;'

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

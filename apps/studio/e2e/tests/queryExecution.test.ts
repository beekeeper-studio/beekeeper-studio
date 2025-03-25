import { _electron as electron } from 'playwright';
import { test, expect, beforeEach, afterEach } from '@playwright/test';
import { NewDatabaseConnection } from '../pageComponents/NewDatabaseConnection';
import { QueryTab } from '../pageComponents/QueryTab';
import { QueryResultPane } from '../pageComponents/QueryResultPane';
import { userActions } from "../pageActions/index";


const POSTGRES_USER = 'postgres';
const POSTGRES_PASSWRD = '';
const POSTGRES_DEFAULT_DB = 'test_beekeeper';
const POSTGRES_QUERY = 'select * from test_load limit 1;';
const CONNECTION_TYPE = 'Postgres';

let electronApp;
let window;
let queryTab;
let resultPane;
let userAttemptsTo;

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

    test.only("perform a Postgres query", async () => {
        const connectionObj = {
            databaseUser: POSTGRES_USER,
            databasePassword: POSTGRES_PASSWRD,
            defaultDatabase: POSTGRES_DEFAULT_DB
        };
        await userAttemptsTo.selectNewConnection(CONNECTION_TYPE);
        await userAttemptsTo.insertDatabaseDetails(connectionObj);
        await userAttemptsTo.connectWithDatabase();

        await expect(queryTab.queryTabTextArea).toBeVisible();

        await userAttemptsTo.writeAQuery(POSTGRES_QUERY);
        await userAttemptsTo.runQuery();

        await expect(resultPane.resultFirstRow).toBeVisible();
    });

});

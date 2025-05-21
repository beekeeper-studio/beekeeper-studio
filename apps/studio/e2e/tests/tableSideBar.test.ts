import { _electron as electron } from 'playwright';
import { test, expect, beforeEach, afterEach } from '@playwright/test';
import { NewDatabaseConnection } from '../pageComponents/NewDatabaseConnection';
import { QueryTab } from '../pageComponents/QueryTab';
import { QueryResultPane } from '../pageComponents/QueryResultPane';
import { TablesSideBar } from '../pageComponents/TablesSideBar';

import { userActions } from "../pageActions/index";

const POSTGRES_USER = 'postgres';
const POSTGRES_PASSWRD = 'T@est1234';
const POSTGRES_DEFAULT_DB = 'test_beekeeper';
const CONNECTION_TYPE = 'Postgres';

let electronApp;
let window;
let queryTab;
let resultPane;
let userAttemptsTo;
let newDatabaseConnection;
let connectionObj;
let tablesSideBar;
let newTableName;
test.describe("Table creation", () => {

    beforeEach(async () => {
        electronApp = await electron.launch({ args: ['dist/main.js'] });
        window = await electronApp.firstWindow();
        newDatabaseConnection = new NewDatabaseConnection(window);
        queryTab = new QueryTab(window);
        resultPane = new QueryResultPane(window);
        tablesSideBar = new TablesSideBar(window);
        userAttemptsTo = userActions(window);
        connectionObj = {
            databaseUser: POSTGRES_USER,
            databasePassword: POSTGRES_PASSWRD,
            defaultDatabase: POSTGRES_DEFAULT_DB
        };

        await userAttemptsTo.selectNewConnection(CONNECTION_TYPE);
        await userAttemptsTo.insertDatabaseDetails(connectionObj);
        await userAttemptsTo.connectWithDatabase();
    });

    afterEach(async () => {
        const dropTableQuery = `DROP TABLE ${newTableName};`
        const newQueryIndex = '1';

        await userAttemptsTo.openNewTab();
        await userAttemptsTo.writeAQuery(dropTableQuery, newQueryIndex);
        await userAttemptsTo.runQuery(newQueryIndex);
        await electronApp.close();
    });

    test("create a table and verify that the columns are visible in the sidebar", async () => {
        newTableName = `automated_test_table_${Date.now()}`;
        const columnName = `test_number_${newTableName}`;
        const CREATE_TABLE_QUERY = `CREATE TABLE ${newTableName} (
                ${columnName} INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );`;

        await userAttemptsTo.writeAQuery(CREATE_TABLE_QUERY);
        await userAttemptsTo.runQuery();
        await userAttemptsTo.expandTableOnSideBar(newTableName);

        await expect(await tablesSideBar.columnInTable(columnName)).toBeVisible();
    });

});

import { _electron as electron } from 'playwright';
import { test, expect, beforeEach, afterEach } from '@playwright/test';
import { QueryTab } from '../pageComponents/QueryTab';
import { QueryResultPane } from '../pageComponents/QueryResultPane';
import { TablesSideBar } from '../pageComponents/TablesSideBar';
import { POSTGRES_CONFIG } from './config/postgresDbConfig';
import { userActions } from "../pageActions/index";
import { launchElectron } from '../helpers/launchElectron';

let electronApp;
let window;
let queryTab;
let resultPane;
let userAttemptsTo;
let tablesSideBar;
let newTableName;

test.describe("Table creation", () => {

    beforeEach(async () => {
        electronApp = await launchElectron();
        window = await electronApp.firstWindow();
        queryTab = new QueryTab(window);
        resultPane = new QueryResultPane(window);
        tablesSideBar = new TablesSideBar(window);
        userAttemptsTo = userActions(window);

        await userAttemptsTo.selectNewConnection(POSTGRES_CONFIG.connectionType);
        await userAttemptsTo.insertDatabaseDetails(POSTGRES_CONFIG);
        await userAttemptsTo.connectWithDatabase();
    });

    afterEach(async () => {
        if (!electronApp) return;
        const dropTableQuery = `DROP TABLE ${newTableName};`
        const newQueryIndex = '1';

        await userAttemptsTo.openNewTab();
        await userAttemptsTo.writeAQuery(dropTableQuery, newQueryIndex);
        await userAttemptsTo.runQuery(newQueryIndex);
        await electronApp.close();
    });

    test.only("create a table and verify that we can see it on the side bar", async () => {
        newTableName = `automated_test_table_${Date.now()}`;
        const CREATE_TABLE_QUERY = `CREATE TABLE ${newTableName} (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL,
                test_number INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );`;

        await userAttemptsTo.writeAQuery(CREATE_TABLE_QUERY);
        await userAttemptsTo.runQuery();

        const tableSideBarButton = await tablesSideBar.tableSideBarButton(newTableName);
        await expect(tableSideBarButton).toBeVisible();
    });

});

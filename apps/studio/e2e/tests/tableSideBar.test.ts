import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { TablesSideBar } from '../pageComponents/TablesSideBar';
import { POSTGRES_CONFIG } from './config/postgresDbConfig';
import { userActions } from "../pageActions/index";
import { launchElectron } from 'e2e/helpers/launchElectron';

let electronApp: ElectronApplication;
let window: Page;
let userAttemptsTo: any;
let tablesSideBar: TablesSideBar;
let newTableName: string;

test.describe("Table creation", () => {
    test.setTimeout(60_000); // 60 seconds

    test.beforeEach(async () => {
        electronApp = await launchElectron();
        window = await electronApp.firstWindow();
        tablesSideBar = new TablesSideBar(window);
        userAttemptsTo = userActions(window);

        await userAttemptsTo.selectNewConnection(POSTGRES_CONFIG.connectionType);
        await userAttemptsTo.insertDatabaseDetails(POSTGRES_CONFIG);
        await userAttemptsTo.connectWithDatabase();
    });

    test.afterEach(async () => {
        if (!electronApp) return;
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

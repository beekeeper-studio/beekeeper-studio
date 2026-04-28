import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { TablesSideBar } from '../pageComponents/TablesSideBar';
import { POSTGRES_CONFIG } from './config/postgresDbConfig';
import { userActions } from "../pageActions/index";
import { launchElectron } from 'e2e/helpers/launchElectron';

let electronApp: ElectronApplication;
let window: Page;
let tablesSideBar: TablesSideBar;
let newTableName: string;
let userAttemptsTo: any;

test.describe("Table creation", () => {

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

    test("create a table and verify that we can see it on the side bar", async () => {
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

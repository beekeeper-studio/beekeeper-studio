import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { NewDatabaseConnection } from '../pageComponents/NewDatabaseConnection';
import { QueryTab } from '../pageComponents/QueryTab';
import { userActions } from "../pageActions/index";
import { POSTGRES_CONFIG } from './config/postgresDbConfig';
import { launchElectron } from 'e2e/helpers/launchElectron';

let electronApp: ElectronApplication;
let window: Page;
let newDatabaseConnection: NewDatabaseConnection;
let queryTab: QueryTab;
let userAttemptsTo: any;


test.describe('New Connection Tests', () => {
    test.beforeEach(async () => {
        electronApp = await launchElectron();
        window = await electronApp.firstWindow();
        userAttemptsTo = userActions(window);
        newDatabaseConnection = new NewDatabaseConnection(window);
        queryTab = new QueryTab(window);
    });

    test.afterEach(async () => {
        if (electronApp) {
            await electronApp.close();
        }
    });

    test('Test a Postgres connection', async () => {
        await userAttemptsTo.selectNewConnection(POSTGRES_CONFIG.connectionType);
        await userAttemptsTo.insertDatabaseDetails(POSTGRES_CONFIG);
        await userAttemptsTo.testDatabaseConnection();
        await expect(newDatabaseConnection.testConnectionButton).toBeVisible();
    });

    test('Connect with a Postgres database', async () => {
        await userAttemptsTo.selectNewConnection(POSTGRES_CONFIG.connectionType);
        await userAttemptsTo.insertDatabaseDetails(POSTGRES_CONFIG);
        await userAttemptsTo.testDatabaseConnection();
        await userAttemptsTo.connectWithDatabase();

        await expect(queryTab.queryTabTextArea).toBeVisible();
    });
});

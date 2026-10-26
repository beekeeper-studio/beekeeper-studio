import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { NewDatabaseConnection } from "../pageComponents/NewDatabaseConnection";
import { QueryTab } from '../pageComponents/QueryTab';
import { QueryResultPane } from '../pageComponents/QueryResultPane';
import { userActions } from '../pageActions/index';
import { launchElectron } from 'e2e/helpers/launchElectron';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

let electronApp: ElectronApplication;
let window: Page;

test.describe("App Launch", () => {

    test.afterEach(async () => {
        if (electronApp) await electronApp.close();
    });

    test("opens the app", async () => {
        electronApp = await launchElectron();
        window = await electronApp.firstWindow();
        const newDatabaseConnection = new NewDatabaseConnection(window);

        await expect(newDatabaseConnection.newConnectionButton).toBeVisible();
    });

    // The utility process loads every database client, native modules
    // included, before it answers. A query result means they all loaded on
    // this platform and architecture, not just the SQLite driver.
    test("runs a query against a SQLite database", async () => {
        const dbFile = path.join(os.tmpdir(), `bks-smoke-${Date.now()}.db`);
        fs.writeFileSync(dbFile, '');

        electronApp = await launchElectron();
        window = await electronApp.firstWindow();
        const userAttemptsTo = userActions(window);

        await userAttemptsTo.selectNewConnection('sqlite');
        await window.locator('#Database').fill(dbFile);
        await userAttemptsTo.connectWithDatabase();

        await expect(new QueryTab(window).queryTabTextArea).toBeVisible();
        await userAttemptsTo.writeAQuery('select 1 as smoke;');
        await userAttemptsTo.runQuery();

        await expect(new QueryResultPane(window).resultFirstRow).toBeVisible();
    });

});

import { _electron as electron } from 'playwright';
import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { NewDatabaseConnection } from "../pageComponents/NewDatabaseConnection";

let electronApp: ElectronApplication;
let window: Page;

test.describe("App Launch", () => {

    test("opens the app", async () => {
        electronApp = await electron.launch({ args: ['dist/main.js'] });
        window = await electronApp.firstWindow();
        const newDatabaseConnection = new NewDatabaseConnection(window);

        await expect(newDatabaseConnection.newConnectionDropdown).toBeVisible();

        await electronApp.close();
    });

});

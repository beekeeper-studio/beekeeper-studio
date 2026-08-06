import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { NewDatabaseConnection } from "../pageComponents/NewDatabaseConnection";
import { launchElectron } from 'e2e/helpers/launchElectron';

let electronApp: ElectronApplication;
let window: Page;

test.describe("App Launch", () => {

    test("opens the app", async () => {
        electronApp = await launchElectron();
        window = await electronApp.firstWindow();
        const newDatabaseConnection = new NewDatabaseConnection(window);

        await expect(newDatabaseConnection.newConnectionDropdown).toBeVisible();

        await electronApp.close();
    });

    test("opens a connection URL from command-line arguments", async () => {
        const connectionUrl = "postgresql://cli-user@localhost/cli-db";
        electronApp = await launchElectron(["--url", connectionUrl]);
        window = await electronApp.firstWindow();

        expect(new URL(window.url()).searchParams.get("url")).toBe(connectionUrl);

        await electronApp.close();
    });

});

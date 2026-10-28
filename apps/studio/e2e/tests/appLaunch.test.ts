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

// app://, plugin:// and theme:// must all be registered as privileged in one
// registerSchemesAsPrivileged call; a later call replaces an earlier one, which
// left only the last scheme a secure context. These load a page from each
// scheme and check the page is a secure context.
test.describe("Privileged schemes", () => {

    const pluginId = 'bks-smoke-secure-context';
    // TEST_MODE puts the user directory at ./tmp, relative to the app's cwd.
    const pluginDir = path.resolve('tmp', 'plugins', pluginId);

    test.beforeAll(() => {
        fs.mkdirSync(pluginDir, { recursive: true });
        fs.writeFileSync(path.join(pluginDir, 'index.html'), '<!doctype html><title>smoke</title>');
    });

    test.afterAll(() => {
        fs.rmSync(pluginDir, { recursive: true, force: true });
    });

    test.afterEach(async () => {
        if (electronApp) await electronApp.close();
    });

    /** Loads `url` in a hidden window and reports its protocol and secure context. */
    function inspectPage(app: ElectronApplication, url: string) {
        return app.evaluate(async ({ BrowserWindow }, pageUrl) => {
            const win = new BrowserWindow({ show: false });
            try {
                await win.loadURL(pageUrl);
                return await win.webContents.executeJavaScript(
                    '({ protocol: location.protocol, isSecureContext: window.isSecureContext })'
                );
            } finally {
                win.destroy();
            }
        }, url);
    }

    test("serves the main window from app:// as a secure context", async () => {
        electronApp = await launchElectron();
        window = await electronApp.firstWindow();

        const page = await window.evaluate(() => ({
            protocol: location.protocol,
            // `window` is the Playwright Page in this file, so use `self`.
            isSecureContext: self.isSecureContext,
            hasSubtleCrypto: !!self.crypto?.subtle,
        }));

        expect(page).toEqual({ protocol: 'app:', isSecureContext: true, hasSubtleCrypto: true });
    });

    test("serves plugin:// pages as a secure context", async () => {
        electronApp = await launchElectron();

        const page = await inspectPage(electronApp, `plugin://${pluginId}/index.html`);

        expect(page).toEqual({ protocol: 'plugin:', isSecureContext: true });
    });

    test("serves theme:// pages as a secure context", async () => {
        electronApp = await launchElectron();

        const page = await inspectPage(electronApp, 'theme://dracula.css');

        expect(page).toEqual({ protocol: 'theme:', isSecureContext: true });
    });

});

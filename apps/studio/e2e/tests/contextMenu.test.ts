import { _electron as electron } from 'playwright';
import { test, expect, beforeEach, afterEach } from '@playwright/test';
import { QueryTab } from '../pageComponents/QueryTab';
import { Footer } from '../pageComponents/Footer';
import { QueryResultPane } from '../pageComponents/QueryResultPane';
import { userActions } from "../pageActions/index";
import { POSTGRES_CONFIG } from './config/postgresDbConfig';

const POSTGRES_QUERY = 'SELECT * FROM actor WHERE actor_id IN (1, 2);';

let electronApp;
let window;
let queryTab;
let footer;
let resultPane;
let userAttemptsTo;

test.describe("Using the context menu", () => {

    beforeEach(async () => {
        electronApp = await electron.launch({
            args: ['dist/main.js'],
        });
        window = await electronApp.firstWindow();
        queryTab = new QueryTab(window);
        resultPane = new QueryResultPane(window);
        footer = new Footer(window);
        userAttemptsTo = userActions(window);


        await userAttemptsTo.selectNewConnection(POSTGRES_CONFIG.connectionType);
        await userAttemptsTo.insertDatabaseDetails(POSTGRES_CONFIG);
        await userAttemptsTo.connectWithDatabase();

        await expect(queryTab.queryTabTextArea).toBeVisible();
    });

    afterEach(async () => {
        await electronApp.close();
    });

    test("paste a query using context menu", async () => {
    // adding a default text to be asserted later
    await window.evaluate((clipboardText) => navigator.clipboard.writeText(clipboardText), POSTGRES_QUERY);

    await queryTab.queryTabTextArea.click({
    button: 'right'
  });

    await window.getByRole('menuitem', { name: 'Paste' }).click();
    const queryTabText = await queryTab.queryTabTextArea.innerText(); 
    await expect(queryTabText).toContain(POSTGRES_QUERY);
    });

    test("paste a password using context menu", async () => {
    // adding a default text to be asserted later
    await window.evaluate((clipboardText) => navigator.clipboard.writeText(clipboardText), POSTGRES_QUERY);
    
    await queryTab.queryTabTextArea.click({
    button: 'right'
  });

    await window.getByRole('menuitem', { name: 'Paste' }).click();
    const queryTabText = await queryTab.queryTabTextArea.innerText(); 
    await expect(queryTabText).toContain(POSTGRES_QUERY);
    });
});

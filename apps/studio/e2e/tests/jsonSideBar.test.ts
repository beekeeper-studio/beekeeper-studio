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

test.describe.only("JSON Sidebar Verifications", () => {

    beforeEach(async () => {
        electronApp = await electron.launch({
            args: ['dist/main.js'],
            // contextOptions: {
            //     acceptDownloads: false,
            //     downloadsPath: './tests'
            // }
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
        await userAttemptsTo.writeAQuery(POSTGRES_QUERY);
        await userAttemptsTo.runQuery();
        await expect(resultPane.resultSecondRow).toBeVisible();
    });

    afterEach(async () => {
        await electronApp.close();
    });

    test("accessing the JSON sidebar", async () => {
        await window.pause();
        const { electron } = require('playwright');

(async () => {
  const browser = await electron.launch({
    headless: false
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://localhost:3003/');
  const page1 = await context.newPage();
  await page1.goto('devtools://devtools/bundled/devtools_app.html?remoteBase=https://chrome-devtools-frontend.appspot.com/serve_file/@b1f90d4f5311667826d6384687fb156361cb5333/&can_dock=true&toolbarColor=rgba(223,223,223,1)&textColor=rgba(0,0,0,1)&experiments=true');
  await page.getByRole('button', { name: 'dock_to_left' }).click();
  await page.getByText('Start Free Trial').click();
  await page.getByRole('button', { name: 'more_vert' }).click();
  await page.getByRole('button', { name: 'more_vert' }).click();
  await page.getByRole('textbox').filter({ hasText: 'SELECT * FROM actor WHERE' }).click();
  await page1.locator('.shadow-split-widget-resizer').first().click();
  await page1.getByRole('navigation', { name: 'Main toolbar' }).getByLabel('Close').click();
  await page1.close();
  await page.getByRole('button', { name: 'more_vert' }).click();
  await page.getByRole('button', { name: 'more_vert' }).click();
  await page.getByText('SELECT * FROM actor WHERE actor_id IN (1, 2);SELECT * FROM actor WHERE actor_id').click();

  // ---------------------
  await context.close();
  await browser.close();
})();
        // await expect(downloadOption).toBeHidden();
    });
});

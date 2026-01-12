import { _electron as electron } from 'playwright';
import { test, expect, beforeEach, afterEach } from '@playwright/test';
import { SideBarToggle } from '../pageComponents/SideBarToggle';
import { QueryResultPane } from '../pageComponents/QueryResultPane';
import { QueryTab } from '../pageComponents/QueryTab';
import { userActions } from "../pageActions/index";
import { POSTGRES_CONFIG } from './config/postgresDbConfig';

const POSTGRES_QUERY = 'SELECT * FROM actor WHERE actor_id IN (1, 2);';


let electronApp;
let window;
let sideBarToggle;
let queryTab;
let resultPane;
let userAttemptsTo;

test.describe("JSON Sidebar Verifications", () => {

    beforeEach(async () => {
     electronApp = await electron.launch({
            args: ['dist/main.js']
        });
        window = await electronApp.firstWindow();
        queryTab = new QueryTab(window);
        resultPane = new QueryResultPane(window);
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

    test.skip("accessing the JSON sidebar", async () => {
        
    await userAttemptsTo.toggleLeftSideBar();
    
    // need to deal with the free trial modal
    // await window.getByText('Start Free Trial').click();
    // await window.getByRole('button', { name: 'more_vert' }).click();
    // need to create the JSON SideBar files, but since we won't be activating this test now...
    const jsonSideBar = await window.locator('[contenteditable="true"][role="textbox"]');
    await expect(jsonSideBar).toBeVisible();
    });
});

import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { QueryTab } from '../pageComponents/QueryTab';
import { Footer } from '../pageComponents/Footer';
import { QueryResultPane } from '../pageComponents/QueryResultPane';
import { userActions } from "../pageActions/index";
import { POSTGRES_CONFIG } from './config/postgresDbConfig';
import { launchElectron } from 'e2e/helpers/launchElectron';

const POSTGRES_QUERY = 'SELECT * FROM actor WHERE actor_id IN (1, 2);';

let electronApp: ElectronApplication;
let window: Page;
let queryTab: QueryTab;
let footer: Footer;
let resultPane: QueryResultPane;
let userAttemptsTo: any;

test.describe("Export Results Verifications", () => {

    test.beforeEach(async () => {
        electronApp = await launchElectron();
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

    test.afterEach(async () => {
        if (electronApp) {
            await electronApp.close();
        }
    });

    test("downloads as CSV", async () => {
        const fileType = "CSV";

        await userAttemptsTo.clickOnDownloadMenu();

        const downloadOption = await footer.downloadAsMenu(fileType);

        await userAttemptsTo.downloadFileAs(fileType);

        await expect(downloadOption).toBeHidden();
    });

    test("downloads as Excel", async () => {
        const fileType = "Excel";

        await userAttemptsTo.clickOnDownloadMenu();

        const downloadOption = await footer.downloadAsMenu(fileType);

        await userAttemptsTo.downloadFileAs(fileType);

        await expect(downloadOption).toBeHidden();
    });

    test("downloads as JSON", async () => {
        const fileType = "JSON";

        await userAttemptsTo.clickOnDownloadMenu();

        const downloadOption = await footer.downloadAsMenu(fileType);

        await userAttemptsTo.downloadFileAs(fileType);

        await expect(downloadOption).toBeHidden();
    });

    test("downloads as Markdown", async () => {
        const fileType = "Markdown";

        await userAttemptsTo.clickOnDownloadMenu();

        const downloadOption = await footer.downloadAsMenu(fileType);

        await userAttemptsTo.downloadFileAs(fileType);

        await expect(downloadOption).toBeHidden();
    });
});

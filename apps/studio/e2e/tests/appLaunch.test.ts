import { _electron as electron } from 'playwright';
import { test, expect } from '@playwright/test';
import { NewDatabaseConnection } from '../pageComponents/NewDatabaseConnection';

let electronApp;
let window;
let newDatabaseConnection;

test.describe('App Launch', () => {
    test.beforeEach(async () => {
        electronApp = await electron.launch({ args: ['dist/main.js'] });
        window = await electronApp.firstWindow();
        newDatabaseConnection = new NewDatabaseConnection(window);
    });

    test.afterEach(async () => {
        await electronApp.close();
    });

    test('launches and shows connection screen', async () => {
        await expect(newDatabaseConnection.newConnectionButton).toBeVisible({ timeout: 10000 });
    });
});

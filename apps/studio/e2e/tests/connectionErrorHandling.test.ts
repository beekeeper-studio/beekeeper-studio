import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchElectron } from 'e2e/helpers/launchElectron';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

let electronApp: ElectronApplication;
let window: Page;

const coreInterface = () => window.locator('#interface.interface');
const errorAlert = () => window.getByText('There was a problem', { exact: false });

test.describe('Connection error handling', () => {
  test.beforeEach(async () => {
    electronApp = await launchElectron();
    window = await electronApp.firstWindow();
  });

  test.afterEach(async () => {
    if (electronApp) await electronApp.close();
  });

  test('sqlite: nonexistent file stays on the connection screen with an error', async () => {
    const dbFile = path.join(os.tmpdir(), `bks-missing-${Date.now()}.db`);
    await window.getByLabel('Connection Type').selectOption('sqlite');
    await window.locator('#Database').fill(dbFile);
    await window.getByRole('button', { name: 'Connect', exact: false }).click();

    await expect(errorAlert()).toBeVisible();
    await expect(window.getByText('Database file not found', { exact: false })).toBeVisible();
    expect(await coreInterface().count()).toBe(0);
    // connecting must not create the file as a side effect
    expect(fs.existsSync(dbFile)).toBe(false);
  });

  test('sqlite: nonexistent directory stays on the connection screen with an error', async () => {
    const dbFile = path.join(os.tmpdir(), `bks-no-dir-${Date.now()}`, 'foo.db');
    await window.getByLabel('Connection Type').selectOption('sqlite');
    await window.locator('#Database').fill(dbFile);
    await window.getByRole('button', { name: 'Connect', exact: false }).click();

    await expect(errorAlert()).toBeVisible();
    expect(await coreInterface().count()).toBe(0);
  });

  test('overlapping connect attempts cannot land in the core interface', async () => {
    test.setTimeout(150000);

    // save a working sqlite connection to double-click later
    const goodDb = path.join(os.tmpdir(), `bks-good-${Date.now()}.db`);
    fs.writeFileSync(goodDb, '');
    await window.getByLabel('Connection Type').selectOption('sqlite');
    await window.locator('#Database').fill(goodDb);
    await window.getByPlaceholder('Connection Name').fill('goodsqlite');
    await window.getByRole('button', { name: 'Save', exact: true }).click();
    await window.waitForTimeout(1000);

    // start a slow, failing postgres connect (non-routable host)
    await window.getByLabel('Connection Type').selectOption('postgresql');
    await window.waitForTimeout(500);
    const hostGroup = window.locator('.form-group')
      .filter({ has: window.locator('label', { hasText: /^Host$/ }) }).first();
    await hostGroup.locator('input').fill('10.255.255.1');
    await window.getByRole('button', { name: 'Connect', exact: false }).first().click();
    await window.waitForTimeout(1500);

    // while the postgres attempt is pending, double-click the saved
    // connection; the attempt in progress must not be raced
    await window.getByText('goodsqlite', { exact: false }).first().dblclick();
    await window.waitForTimeout(5000);
    expect(await coreInterface().count()).toBe(0);

    // the pending postgres attempt eventually fails; its error belongs on the
    // connection screen, not on top of the core interface
    await expect(errorAlert()).toBeVisible({ timeout: 60000 });
    expect(await coreInterface().count()).toBe(0);
  });
});

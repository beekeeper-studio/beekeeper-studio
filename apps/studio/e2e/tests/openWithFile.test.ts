import { test, expect, ElectronApplication, Page } from '@playwright/test';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { launchElectron } from 'e2e/helpers/launchElectron';
import { NewDatabaseConnection } from '../pageComponents/NewDatabaseConnection';
import { QueryTab } from '../pageComponents/QueryTab';

let electronApp: ElectronApplication;
let window: Page;

// Regression tests for https://github.com/beekeeper-studio/beekeeper-studio/issues/4214
//
// Cold-starting the app with a sqlite file path or `open-url` URL scheme used
// to leave the user stuck on the New Connection screen — the URL/file was
// silently ignored. After the fix, every entry path (positional argv,
// open-file, open-url, activate) goes through the same `openUrlOrFile` helper.
test.describe('Cold-start opens the URL/file directly', () => {
  let dbPath: string;
  let secondDbPath: string;

  test.beforeAll(() => {
    // SQLite treats an empty file as a fresh database, so we don't need to
    // pre-populate it. The point of these tests is the cold-start routing,
    // not the contents of the database.
    dbPath = path.join(os.tmpdir(), `bks-cold-start-${Date.now()}.sqlite`);
    secondDbPath = path.join(os.tmpdir(), `bks-cold-start-${Date.now()}-2.sqlite`);
    fs.writeFileSync(dbPath, '');
    fs.writeFileSync(secondDbPath, '');
  });

  test.afterAll(() => {
    try { fs.unlinkSync(dbPath); } catch { /* file may already be gone */ }
    try { fs.unlinkSync(secondDbPath); } catch { /* file may already be gone */ }
  });

  test.afterEach(async () => {
    if (electronApp) await electronApp.close();
  });

  test('positional sqlite arg opens straight into the connected interface', async () => {
    electronApp = await launchElectron({ args: [dbPath] });
    window = await electronApp.firstWindow();

    // No stray empty New Connection window — exactly one BrowserWindow.
    expect(electronApp.windows().length).toBe(1);

    const newDatabaseConnection = new NewDatabaseConnection(window);
    const queryTab = new QueryTab(window);

    // The connection-type dropdown is the canonical "we're on New Connection"
    // signal. After the fix, we should never see it on this launch path.
    await expect(newDatabaseConnection.newConnectionDropdown).toBeHidden();

    // CoreInterface is up — query tab textarea is visible.
    await expect(queryTab.queryTabTextArea).toBeVisible();
  });

  // Reproduces the macOS double-click flow: app already running, the OS
  // delivers a file via the `open-file` event. The fix routes that event
  // through the same `openUrlOrFile` helper as the cold-start argv path,
  // so a fresh BrowserWindow is built with the file URL and the renderer
  // boots straight into the connected interface.
  test('open-file event after launch opens a new window for the file', async () => {
    electronApp = await launchElectron();
    window = await electronApp.firstWindow();

    const initialWindowCount = electronApp.windows().length;

    const [newPage] = await Promise.all([
      electronApp.waitForEvent('window'),
      electronApp.evaluate(({ app }, file) => {
        app.emit('open-file', { preventDefault() { /* no-op */ } }, file);
      }, secondDbPath),
    ]);

    // A new window was created in response to the open-file event.
    expect(electronApp.windows().length).toBe(initialWindowCount + 1);

    const newDatabaseConnection = new NewDatabaseConnection(newPage);
    const queryTab = new QueryTab(newPage);

    await expect(newDatabaseConnection.newConnectionDropdown).toBeHidden();
    await expect(queryTab.queryTabTextArea).toBeVisible();
  });
});

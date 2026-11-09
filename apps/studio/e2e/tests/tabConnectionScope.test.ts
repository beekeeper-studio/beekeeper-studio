import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import { userActions } from '../pageActions/index';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

async function launch(): Promise<{ app: ElectronApplication; win: Page }> {
  const app = await electron.launch({
    args: ['dist/main.js'],
    env: { ...process.env, TEST_MODE: '1' },
  });
  const win = await app.firstWindow();
  await win.setViewportSize({ width: 1600, height: 1000 });
  await win.waitForTimeout(1500);
  try {
    await win.getByText("Don't show again", { exact: false }).click({ timeout: 800 });
  } catch (e) { /* no dialog */ }
  return { app, win };
}

// Tabs, pins, hidden entities and query history are keyed on a saved_connection
// id (isConnectionScope in src/handlers/utils.ts). A session on a connection
// that was never saved has no such id, so it must always open an empty core
// interface - nothing is persisted for it and nothing is restored.
const MARKER = 'select 1 as tab_scope_marker;';

async function typeIntoFirstTab(win: Page) {
  const editor = win.locator('#tab-0').getByRole('textbox');
  await expect(editor).toBeVisible({ timeout: 30000 });
  await editor.click();
  await editor.fill(MARKER);
  await expect(editor).toContainText('tab_scope_marker');
  await win.waitForTimeout(2500); // past the 1s autosave debounce
}

test('anonymous connection: tabs do NOT come back', async () => {
  test.setTimeout(180000);
  const dbFile = path.join(os.tmpdir(), `bks-anon-${Date.now()}.db`);
  fs.writeFileSync(dbFile, '');
  const dbName = path.basename(dbFile);

  let { app, win } = await launch();
  await userActions(win).selectNewConnection('sqlite');
  await win.locator('#Database').fill(dbFile);
  await win.getByRole('button', { name: 'Connect', exact: false }).click();
  await typeIntoFirstTab(win);
  await app.close();

  // Reconnect via the recent-connections list - the path that used to smuggle
  // a used_connection id into the core interface.
  ({ app, win } = await launch());
  const recent = win.locator('.recent-connection-list').getByText(dbName, { exact: false }).first();
  await expect(recent).toBeVisible({ timeout: 15000 });
  await recent.dblclick();

  const editor = win.locator('#tab-0').getByRole('textbox');
  await expect(editor).toBeVisible({ timeout: 30000 });
  await win.waitForTimeout(4000);
  const text = await editor.textContent();
  const tabCount = await win.locator('.tabs-header .nav-item').count();
  console.log(`[ANON] editor text: ${JSON.stringify(text)} tabCount=${tabCount}`);
  await app.close();

  expect(text).not.toContain('tab_scope_marker');
});

test('saved connection: tabs DO come back', async () => {
  test.setTimeout(180000);
  const dbFile = path.join(os.tmpdir(), `bks-saved-${Date.now()}.db`);
  fs.writeFileSync(dbFile, '');

  let { app, win } = await launch();
  await userActions(win).selectNewConnection('sqlite');
  await win.locator('#Database').fill(dbFile);
  await win.getByPlaceholder('Connection Name').fill('SavedScopeConn');
  await win.getByRole('button', { name: 'Save', exact: true }).click();
  await win.waitForTimeout(1000);
  await win.getByRole('button', { name: 'Connect', exact: false }).first().click();
  await typeIntoFirstTab(win);
  await app.close();

  ({ app, win } = await launch());
  const saved = win.getByText('SavedScopeConn', { exact: false }).first();
  await expect(saved).toBeVisible({ timeout: 15000 });
  await saved.dblclick();

  const editor = win.locator('#tab-0').getByRole('textbox');
  await expect(editor).toBeVisible({ timeout: 30000 });
  await win.waitForTimeout(4000);
  const text = await editor.textContent();
  console.log(`[SAVED] editor text: ${JSON.stringify(text)}`);
  await app.close();

  expect(text).toContain('tab_scope_marker');
});

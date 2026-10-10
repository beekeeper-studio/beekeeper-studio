import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import { userActions } from '../pageActions/index';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

const SCREENSHOT_DIR = process.env.BKS_E2E_SCREENSHOT_DIR || path.join('test-results', 'confirm-window-close');
const MENU_ITEM = 'Confirm Before Closing Unsaved Tabs';

test.describe.configure({ mode: 'serial' });
test.skip(process.platform === 'darwin', 'uses the in-window menu (Windows/Linux only)');

async function launch(): Promise<{ app: ElectronApplication; win: Page }> {
  const app = await electron.launch({
    args: ['dist/main.js'],
    // close listeners are off in test mode unless a spec opts in
    env: { ...process.env, TEST_MODE: '1', BKS_TEST_WINDOW_CLOSE_LISTENERS: '1' },
  });
  const win = await app.firstWindow();
  await win.setViewportSize({ width: 1600, height: 1000 });
  await win.waitForTimeout(1500);
  try {
    await win.getByText("Don't show again", { exact: false }).click({ timeout: 800 });
  } catch (e) { /* no dialog */ }
  return { app, win };
}

// In TEST_MODE `dist/main.js` from argv is taken as a connection URL, so the
// app starts its own connect at boot and rejects ours until that settles.
async function connectSqlite(win: Page, dbFile: string) {
  await userActions(win).selectNewConnection('sqlite');
  await win.locator('#Database').fill(dbFile);
  const coreTabs = win.locator('.core-tabs');
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      await win.getByRole('button', { name: 'Connect', exact: true }).click({ timeout: 5000 });
    } catch (e) { /* disabled while an attempt is pending */ }
    try {
      await expect(coreTabs).toBeVisible({ timeout: 5000 });
      return;
    } catch (e) { /* retry */ }
  }
  await expect(coreTabs).toBeVisible({ timeout: 5000 });
}

const viewMenu = (win: Page) => win.locator('.flyout-nav .top-menu-item > a', { hasText: 'View' });
const promptMenuItem = (win: Page) => win.locator('.flyout-nav li.menu-item > a', { hasText: MENU_ITEM });
const dialogTitle = (win: Page) => win.getByText('Close this window?', { exact: false });

async function promptEnabledInMenu(win: Page): Promise<boolean> {
  await viewMenu(win).click();
  await expect(promptMenuItem(win)).toBeVisible();
  const ticked = (await promptMenuItem(win).locator('.material-icons', { hasText: 'done' }).count()) > 0;
  await viewMenu(win).click();
  return ticked;
}

// the setting lives in ./tmp and survives runs and retries
async function setPromptViaMenu(win: Page, enabled: boolean) {
  if (await promptEnabledInMenu(win) === enabled) return;
  await viewMenu(win).click();
  await promptMenuItem(win).click();
  await expect.poll(() => promptEnabledInMenu(win), { timeout: 10000 }).toBe(enabled);
}

async function typeIntoFirstTab(win: Page, text: string) {
  const editor = win.locator('#tab-0').getByRole('textbox');
  await expect(editor).toBeVisible({ timeout: 30000 });
  await editor.click();
  await editor.fill(text);
  await expect(editor).toContainText(text);
  await win.waitForTimeout(500);
}

function newDbFile(name: string) {
  const dbFile = path.join(os.tmpdir(), `bks-${name}-${Date.now()}.db`);
  fs.writeFileSync(dbFile, '');
  return dbFile;
}

// times the window, not the process: without a connection the app lingers on Playwright's debugger
async function timeToClose(app: ElectronApplication, win: Page): Promise<number> {
  const closed = win.waitForEvent('close', { timeout: 15000 });
  const start = Date.now();
  await win.locator('#quit').click();
  await closed;
  const elapsed = Date.now() - start;
  await app.close().catch(() => {});
  return elapsed;
}

test('closes right away when nothing is unsaved', async () => {
  test.setTimeout(240000);

  let { app, win } = await launch();
  const fromConnectionScreen = await timeToClose(app, win);

  ({ app, win } = await launch());
  await setPromptViaMenu(win, true);
  await connectSqlite(win, newDbFile('close-clean'));
  await expect(win.locator('#tab-0').getByRole('textbox')).toBeVisible({ timeout: 30000 });
  const withCleanTab = await timeToClose(app, win);

  console.log(`[close time] connection screen: ${fromConnectionScreen}ms, clean tab: ${withCleanTab}ms`);
  expect(fromConnectionScreen).toBeLessThan(2000);
  expect(withCleanTab).toBeLessThan(2000);
});

test('asks before closing with unsaved tabs; cancel keeps the window, confirm closes it', async () => {
  test.setTimeout(240000);
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const { app, win } = await launch();
  await setPromptViaMenu(win, true);
  await connectSqlite(win, newDbFile('close-confirm'));
  await typeIntoFirstTab(win, 'select 1 as close_confirm_marker;');

  await win.locator('#quit').click();
  await expect(dialogTitle(win)).toBeVisible({ timeout: 10000 });
  await expect(win.getByText("Don't show this again", { exact: false })).toBeVisible();
  // tab area only, the sidebar shows the temp path of the test database
  await win.locator('.core-tabs').screenshot({ path: path.join(SCREENSHOT_DIR, 'confirm-window-close-dialog.png') });

  await win.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialogTitle(win)).not.toBeVisible({ timeout: 5000 });
  await expect(win.locator('#tab-0').getByRole('textbox')).toContainText('close_confirm_marker');

  await win.locator('#quit').click();
  await expect(dialogTitle(win)).toBeVisible({ timeout: 10000 });
  await win.getByRole('button', { name: 'Close Window', exact: true }).click();
  await app.waitForEvent('close', { timeout: 15000 });
});

test('"Don\'t show this again" turns the prompt off and unticks the menu item', async () => {
  test.setTimeout(240000);
  const dbFile = newDbFile('close-confirm-skip');

  const { app, win } = await launch();
  await setPromptViaMenu(win, true);
  await connectSqlite(win, dbFile);
  await typeIntoFirstTab(win, 'select 1 as close_confirm_skip_marker;');

  await win.locator('#quit').click();
  await expect(dialogTitle(win)).toBeVisible({ timeout: 10000 });
  await win.getByText("Don't show this again", { exact: false }).click();
  await win.getByRole('button', { name: 'Close Window', exact: true }).click();
  await app.waitForEvent('close', { timeout: 15000 });

  const { app: app2, win: win2 } = await launch();
  expect(await promptEnabledInMenu(win2)).toBe(false);
  await connectSqlite(win2, dbFile);
  await typeIntoFirstTab(win2, 'select 1 as close_confirm_skip_marker_2;');
  await win2.locator('#quit').click();
  await app2.waitForEvent('close', { timeout: 15000 });
});

test('the View menu item turns the prompt back on', async () => {
  test.setTimeout(240000);

  const { app, win } = await launch();
  await setPromptViaMenu(win, false);
  await setPromptViaMenu(win, true);
  await connectSqlite(win, newDbFile('close-confirm-menu'));
  await typeIntoFirstTab(win, 'select 1 as close_confirm_menu_marker;');

  await win.locator('#quit').click();
  await expect(dialogTitle(win)).toBeVisible({ timeout: 10000 });
  await win.getByRole('button', { name: 'Close Window', exact: true }).click();
  await app.waitForEvent('close', { timeout: 15000 });
});

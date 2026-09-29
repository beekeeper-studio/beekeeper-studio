import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import { userActions } from '../pageActions/index';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

// Real-app coverage for the window-close confirmation (#2201): closing a
// window while a tab has unsaved changes asks first, offers "Don't show this
// again", and cancelling keeps the window and the text.

// Where to drop the screenshot of the dialog; defaults next to the other
// Playwright output.
const SCREENSHOT_DIR = process.env.BKS_E2E_SCREENSHOT_DIR || path.join('test-results', 'confirm-window-close');

test.describe.configure({ mode: 'serial' });

async function launch(): Promise<{ app: ElectronApplication; win: Page }> {
  const app = await electron.launch({
    args: ['dist/main.js'],
    // The prompt is off in test mode (Playwright's app.quit() would hang on
    // it in every other spec) - this spec is the one that turns it back on.
    env: { ...process.env, TEST_MODE: '1', BKS_TEST_CONFIRM_WINDOW_CLOSE: '1' },
  });
  const win = await app.firstWindow();
  await win.setViewportSize({ width: 1600, height: 1000 });
  await win.waitForTimeout(1500);
  try {
    await win.getByText("Don't show again", { exact: false }).click({ timeout: 800 });
  } catch (e) { /* no dialog */ }
  return { app, win };
}

// In TEST_MODE the app parses argv from index 1, so the `dist/main.js`
// Playwright launches with is taken as a connection URL and App.vue starts
// its own connect attempt at boot. Until that attempt settles, the store
// rejects ours with "A connection attempt is already in progress" - so keep
// clicking Connect until the core interface actually shows up.
async function connectSqlite(win: Page, dbFile: string) {
  await userActions(win).selectNewConnection('sqlite');
  await win.locator('#Database').fill(dbFile);
  const coreTabs = win.locator('.core-tabs');
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      await win.getByRole('button', { name: 'Connect', exact: true }).click({ timeout: 5000 });
    } catch (e) { /* button disabled while an attempt is pending */ }
    try {
      await expect(coreTabs).toBeVisible({ timeout: 5000 });
      return;
    } catch (e) { /* still blocked by the boot-time attempt, retry */ }
  }
  await expect(coreTabs).toBeVisible({ timeout: 5000 });
}

// The preference lives in the app db under ./tmp, which survives between
// runs (and Playwright retries) - start every test from "prompt enabled".
async function resetDontConfirmSetting(win: Page) {
  await win.evaluate(async () => {
    const vm = (document.querySelector('.core-tabs') as any).__vue__;
    await vm.$store.dispatch('settings/save', { key: 'dontConfirmWindowClose', value: false });
  });
}

async function typeIntoFirstTab(win: Page, marker: string) {
  const editor = win.locator('#tab-0').getByRole('textbox');
  await expect(editor).toBeVisible({ timeout: 30000 });
  await editor.click();
  await editor.fill(marker);
  await expect(editor).toContainText(marker);
  await win.waitForTimeout(500); // let the dirty-tab flag actually flip
}

test('closing the window with unsaved changes prompts; cancel keeps it open, confirm closes it', async () => {
  test.setTimeout(240000);
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const dbFile = path.join(os.tmpdir(), `bks-close-confirm-${Date.now()}.db`);
  fs.writeFileSync(dbFile, '');

  const { app, win } = await launch();
  await connectSqlite(win, dbFile);
  await resetDontConfirmSetting(win);
  await typeIntoFirstTab(win, 'select 1 as close_confirm_marker;');

  // The real titlebar close button: window.main.closeWindow() -> IPC ->
  // WindowBuilder's 'close' handler, not a synthetic event.
  await win.locator('#quit').click();

  const dialogTitle = win.getByText('Close this window?', { exact: false });
  await expect(dialogTitle).toBeVisible({ timeout: 10000 });
  await expect(win.getByText("Don't show this again", { exact: false })).toBeVisible();

  // Tab area only (the dialog overlays it): the sidebar would show the
  // temp-dir path of the test database.
  await win.locator('.core-tabs').screenshot({ path: path.join(SCREENSHOT_DIR, 'confirm-window-close-dialog.png') });

  await win.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialogTitle).not.toBeVisible({ timeout: 5000 });

  // Still here, text still there: main really kept the window open.
  await expect(win.locator('#tab-0').getByRole('textbox')).toContainText('close_confirm_marker');

  // Second attempt, confirmed this time: the window (and with it the app)
  // actually closes.
  await win.locator('#quit').click();
  await expect(dialogTitle).toBeVisible({ timeout: 10000 });
  await win.getByRole('button', { name: 'Close Window', exact: true }).click();
  await app.waitForEvent('close', { timeout: 15000 });
});

test('"Don\'t show this again" suppresses the prompt on the next unsaved close', async () => {
  test.setTimeout(240000);

  const dbFile = path.join(os.tmpdir(), `bks-close-confirm-skip-${Date.now()}.db`);
  fs.writeFileSync(dbFile, '');

  const { app, win } = await launch();
  await connectSqlite(win, dbFile);
  await resetDontConfirmSetting(win);
  await typeIntoFirstTab(win, 'select 1 as close_confirm_skip_marker;');

  await win.locator('#quit').click();
  await expect(win.getByText('Close this window?', { exact: false })).toBeVisible({ timeout: 10000 });
  await win.getByText("Don't show this again", { exact: false }).click();
  await win.getByRole('button', { name: 'Close Window', exact: true }).click();
  await app.waitForEvent('close', { timeout: 15000 });

  // Fresh process, fresh unsaved tab: the saved preference must already be in
  // effect, so no dialog and the window closes straight away.
  const { app: app2, win: win2 } = await launch();
  await connectSqlite(win2, dbFile);
  await typeIntoFirstTab(win2, 'select 1 as close_confirm_skip_marker_2;');

  await win2.locator('#quit').click();
  await app2.waitForEvent('close', { timeout: 15000 });
});

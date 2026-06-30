import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import * as path from 'path';
import * as os from 'os';

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

test('restores in-progress edits to a SAVED query after relaunch', async () => {
  const dbFile = path.join(os.tmpdir(), `bks-restore-${Date.now()}.db`);
  const dbName = path.basename(dbFile);
  const SAVED = 'select 1 as original_saved_text;';
  const EDITED = 'select 999 as restored_after_relaunch;';

  // ---------- First launch: connect, save a query, edit it, let it autosave ----------
  let { app, win } = await launch();

  await win.getByLabel('Connection Type').selectOption('sqlite');
  await win.locator('#Database').fill(dbFile);
  await win.getByRole('button', { name: 'Connect' }).click();

  const editor = win.locator('#tab-0').getByRole('textbox');
  await expect(editor).toBeVisible({ timeout: 30000 });
  await editor.click();
  await editor.fill(SAVED);

  // Save as a favorite/saved query (Ctrl+S opens the save modal)
  await win.keyboard.press('Control+s');
  const titleInput = win.locator('input[name="title"]');
  await expect(titleInput).toBeVisible({ timeout: 10000 });
  await titleInput.fill('RestoreTestQuery');
  await win.locator('form button[type="submit"].btn-primary').first().click();
  await win.waitForTimeout(1500); // let the save settle

  // Now edit the saved query and wait past the 1s autosave debounce
  await editor.click();
  await editor.fill(EDITED);
  await expect(editor).toContainText('restored_after_relaunch');
  await win.waitForTimeout(2500);

  await app.close();

  // ---------- Second launch: reconnect to the same DB, expect the edits restored ----------
  ({ app, win } = await launch());

  // Recent connections connect on double-click; the item shows the db file name
  const recent = win.locator('.recent-connection-list').getByText(dbName, { exact: false }).first();
  await expect(recent).toBeVisible({ timeout: 15000 });
  await recent.dblclick();

  const editor2 = win.locator('#tab-0').getByRole('textbox');
  await expect(editor2).toBeVisible({ timeout: 30000 });

  // The fix: the editor should show the EDITED text (restored from unsavedQueryText),
  // not revert to the SAVED text.
  await expect(editor2).toContainText('restored_after_relaunch', { timeout: 15000 });
  await expect(editor2).not.toContainText('original_saved_text');

  await win.screenshot({ path: 'e2e/savedQueryRestore.png', fullPage: false });

  await app.close();
});

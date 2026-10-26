// BUG-2 repro: closing a tab with unsaved changes leaves the "Really close ?" modal stuck on screen.
//   node repro_close_unsaved.js            (opens the query editor, types text, Ctrl+W, clicks Confirm)
// Expected: tab closes and the modal disappears.  6.2.0-beta.3: tab closes, modal stays (title loses the tab name),
// Confirm / Cancel / Esc do nothing -> UI blocked until the renderer is reloaded (page.reload()).  6.1.6 is fine.
const { attach, shot, tabTitles, modalUp } = require('./lib');
(async () => {
  const { browser, page } = await attach();
  await page.keyboard.press('Control+t'); await page.waitForTimeout(1000);
  await page.locator('.cm-content').filter({ visible: true }).first().click();
  await page.keyboard.insertText('select 1 as unsaved_text;'); await page.waitForTimeout(500);
  console.log('tabs before:', await tabTitles(page));
  await page.keyboard.press('Control+w'); await page.waitForTimeout(800);
  console.log('dialog:', (await page.locator('.v--modal-box').innerText().catch(() => 'none')).replace(/\s+/g, ' '));
  await page.locator('.v--modal-box').getByRole('button', { name: 'Confirm' }).click(); await page.waitForTimeout(1500);
  const stuck = await modalUp(page);
  console.log('tabs after:', await tabTitles(page), '| modal still visible (BUG when true):', stuck);
  await shot(page, 'close-unsaved-after-confirm');
  await browser.close();
})();

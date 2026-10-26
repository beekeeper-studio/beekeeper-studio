// Connect to a SQLite file from the welcome screen:  node connect.js /abs/path/file.db
// (the SQLite "Database" field is an editable input, so no native dialog is needed.)
// To reconnect from the RECENT list instead:  node connect.js --recent qa.db
const { attach, shot, tabTitles } = require('./lib');
(async () => {
  const { browser, page } = await attach();
  if (process.argv[2] === '--recent') {
    await page.getByText(process.argv[3], { exact: true }).first().dblclick();
  } else {
    await page.getByText("Don't show again").click({ timeout: 1500 }).catch(() => {});
    await page.getByRole('button', { name: /New Connection/ }).first().click(); await page.waitForTimeout(800);
    await page.getByText('SQLite', { exact: true }).first().click();
    await page.getByRole('button', { name: 'Next' }).click(); await page.waitForTimeout(800);
    await page.locator('#Database').fill(process.argv[2]);
    await page.getByRole('button', { name: 'Connect' }).click();
  }
  await page.waitForTimeout(3500);
  console.log('tabs:', await tabTitles(page));
  await shot(page, 'connected');
  await browser.close();
})();

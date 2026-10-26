// BUG-3/4 repro: enable Community Plugins from Tools > Manage Plugins > Browse, then dump the effective config.
//   launch_fresh.sh <app> <fakeHome> 9224 ; BKS_PORT=9224 node repro_enable_community_plugins.js
// Expected: communityDisabled=false and the community list loads.  6.2.0-beta.3 on a first-run profile:
// `user.config.ini` is never created -> utility.log: "config/writeUserValue ... ENOENT ... user.config.ini";
// config still communityDisabled=true, list stays empty, toggle visually flips then reverts on re-render.
// Also shows BUG-4: the "Official Plugins" toggle always renders ON (getter reads nonexistent `officialEnabled`,
// setter writes nonexistent `ultimateDisabled`) while officialDisabled stays true.
const { attach, shot } = require('./lib');
(async () => {
  const { browser, page } = await attach();
  await page.getByText("Don't show again").click({ timeout: 1500 }).catch(() => {});
  await page.getByText('Tools', { exact: true }).first().click(); await page.waitForTimeout(500);
  await page.getByText('Manage Plugins', { exact: true }).filter({ visible: true }).first().click(); await page.waitForTimeout(1500);
  await page.getByText('Browse', { exact: true }).filter({ visible: true }).first().click(); await page.waitForTimeout(2000);
  await page.mouse.click(938, 240); await page.waitForTimeout(1000);                       // Community toggle
  await page.locator('.v--modal-box').filter({ hasText: 'Enable Community Plugins' }).getByRole('button', { name: 'Enable' }).click();
  await page.waitForTimeout(6000);
  await shot(page, 'plugins-after-enable');
  const cfg = await page.evaluate(() => { const r = [...document.querySelectorAll('*')].find(e => e.__vue__).__vue__; const c = r.$root.$bksConfig.pluginSystem; return { communityDisabled: c.communityDisabled, officialDisabled: c.officialDisabled }; });
  console.log('effective config after toggling Community on:', cfg, '(expected communityDisabled:false)');
  const entries = await page.evaluate(() => { const r = [...document.querySelectorAll('*')].find(e => e.__vue__).__vue__; return r.$root.$util.send('plugin/entries').then(x => ({ official: x.official.length, community: x.community.length })); });
  console.log('registry entries loaded:', entries, '(expected community > 0)');
  await browser.close();
})();

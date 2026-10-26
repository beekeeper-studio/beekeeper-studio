// BUG-1 repro (SQLite structure editor): rename + add + drop in ONE Apply.
//   node repro_structure_combo.js <table> [rename] [add] [drop]      (table must have columns: id, title, budget)
// Expected: all changes applied.  6.2.0-beta.3: error 'no such column: ""project_title""', add/drop applied but rename NOT,
// UI left showing stale pending rows.  Generated SQL (Apply dropdown > Copy to SQL) contains
//   RENAME COLUMN "project_title" TO "project_title"   (old name replaced by the new one)
// Each flag alone works; run once per fresh table.  Layout assumes the "info" banner is shown (no error banner yet).
const { attach, shot, visibleRows } = require('./lib');
(async () => {
  const [table, ...ops] = process.argv.slice(2);
  const { browser, page } = await attach();
  if (!(await page.locator('.table-name').first().isVisible().catch(() => false))) await page.mouse.click(22, 59);
  await page.locator('.table-name', { hasText: new RegExp(`^${table}$`) }).first().dblclick(); await page.waitForTimeout(1500);
  await page.locator('x-button').filter({ hasText: /Structure/ }).first().click(); await page.waitForTimeout(1200);
  const typeIn = async (x, y, v) => { await page.mouse.dblclick(x, y); await page.waitForTimeout(400); await page.keyboard.press('Control+a'); await page.keyboard.type(v); await page.keyboard.press('Enter'); await page.waitForTimeout(500); };
  // row y: id 266, title 307, budget 348, new column 389
  if (ops.includes('add')) { await page.mouse.click(1125, 191); await page.waitForTimeout(700); await typeIn(380, 389, 'owner'); }
  if (ops.includes('rename')) await typeIn(380, 307, 'project_title');
  if (ops.includes('drop')) { await page.mouse.click(1158, 348); await page.waitForTimeout(600); }
  await shot(page, `struct-${table}-pending`);
  await page.mouse.click(1092, 782); await page.waitForTimeout(1800);   // Apply
  await shot(page, `struct-${table}-after-apply`);
  console.log('error banner:', await page.getByText('There was a problem').isVisible().catch(() => false));
  console.log('rows:', await visibleRows(page));
  await browser.close();
})();

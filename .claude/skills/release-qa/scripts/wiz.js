// Drives the Import wizard tab ("Create Table and Import Data" / "Import Table: x"), one step per call.
//   node wiz.js <next-choose|pick-click|map|review|run> [screenshotPrefix]
// File selection is a native dialog:  node wiz.js pick-click ; sleep 2 ; gtkdialog.sh /abs/file.csv ; node wiz.js map
// (pick-click's screenshot times out while the dialog blocks the renderer - that is expected; ignore the error.)
const { attach, shot, clickNonBlocking } = require('./lib');
(async () => {
  const act = process.argv[2], pfx = process.argv[3] || 'wiz';
  const { browser, page } = await attach();
  const sel = 'button, x-button, a.btn';
  if (act === 'next-choose') await clickNonBlocking(page, sel, /^Choose File/);
  if (act === 'pick-click') await clickNonBlocking(page, sel, /^Choose File$/);
  if (act === 'map') await clickNonBlocking(page, sel, /^Map to Table/);
  if (act === 'review') await clickNonBlocking(page, sel, /^Review & Execute/);
  if (act === 'run') await clickNonBlocking(page, sel, /^Run The Import/);
  await page.waitForTimeout(act === 'run' ? 4000 : 1500);
  await shot(page, `${pfx}-${act}`);
  console.log(act, '->', (await page.innerText('body')).replace(/\s+/g, ' ').match(/(1\. Select|2\. Choose|3\. Map|4\. Review|Import Successful[^.]*|Import Failed[^.]*)/g));
  await browser.close();
})();

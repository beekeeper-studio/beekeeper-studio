// Shared helpers for driving Beekeeper Studio over CDP with Playwright.
//   env: BKS_PORT (default 9222) - which instance to attach to
//        QA_DIR   (default ./qa-out) - screenshots land in $QA_DIR/shots
//        PLAYWRIGHT_PATH - override if playwright is not at /opt/node-tools
// Every script attaches, does its thing, and calls browser.close() (that only DISCONNECTS; the app keeps running).
const path = require('path');
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node-tools/node_modules/playwright');
const SHOTS = path.join(process.env.QA_DIR || path.join(process.cwd(), 'qa-out'), 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

// Do NOT call page.setViewportSize(): the window is already 1200x800 at (196,100) on the 1600x1000 display.
async function attach(port = process.env.BKS_PORT || 9222) {
  const browser = await chromium.connectOverCDP(`http://localhost:${port}`);
  const ctx = browser.contexts()[0];
  const page = ctx.pages().find(p => p.url().startsWith('app://')) || ctx.pages()[0];
  return { browser, ctx, page };
}

async function shot(page, name) {
  const file = path.join(SHOTS, `${name}.png`);
  await page.screenshot({ path: file });
  console.log('shot ->', file);
  return file;
}

// Native dialogs (file choosers) are SYNCHRONOUS in the renderer: the page freezes until they close, so an awaited
// click/screenshot hangs. Fire the click from a timer inside the page, return immediately, then run gtkdialog.sh.
//   await clickNonBlocking(page, 'a.btn', /^Choose File$/);   // then: gtkdialog.sh /abs/path
async function clickNonBlocking(page, selector, textRegex) {
  await page.evaluate(([sel, src]) => {
    setTimeout(() => {
      const re = new RegExp(src);
      [...document.querySelectorAll(sel)].filter(e => e.offsetParent && re.test(e.innerText.trim())).pop().click();
    }, 100);
  }, [selector, textRegex.source]);
}

// Text of the rows currently visible in the active tab's grid (hidden tabs stay in the DOM, so filter by visibility).
const visibleRows = page => page.evaluate(() =>
  [...document.querySelectorAll('.tabulator-row')].filter(r => r.offsetParent)
    .map(r => [...r.querySelectorAll('.tabulator-cell')].map(c => c.innerText.trim()).join('|')));

// Overwrite a tabulator cell: dbl-click, select all, type, Enter.
async function editCell(page, rowIdx, colIdx, value) {
  const cell = page.locator('.tabulator-row:visible').nth(rowIdx).locator('.tabulator-cell').nth(colIdx);
  await cell.dblclick(); await page.waitForTimeout(300);
  await page.keyboard.press('Control+a'); await page.keyboard.type(value); await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
}

// Replace the content of the first visible CodeMirror editor (query editor, JSON modal ...).
async function setEditorText(page, text, scope = '') {
  const ed = page.locator(`${scope} .cm-content`.trim()).filter({ visible: true }).first();
  await ed.click(); await page.keyboard.press('Control+a'); await page.keyboard.press('Delete');
  await page.keyboard.insertText(text);
}

const tabTitles = async page => (await page.locator('.nav-tabs .nav-item').allInnerTexts()).map(s => s.replace(/\n/g, ' '));
const modalUp = page => page.locator('.v--modal-box').isVisible().catch(() => false);

module.exports = { attach, shot, clickNonBlocking, visibleRows, editCell, setEditorText, tabTitles, modalUp, SHOTS };

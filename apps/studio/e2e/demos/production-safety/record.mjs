// Records the "safe changes in production" demo video of Beekeeper Studio.
// See README.md in this folder and ../README.md for the toolkit.
//
//   node e2e/demos/production-safety/record.mjs            (from apps/studio)
//   NO_RECORD=1 SHOTS=1 node e2e/demos/production-safety/record.mjs   (dry run)
import { runDemo, here, card, prepareProfile, postgresConnection, pgFromEnv, reseed } from '../lib/index.mjs'

const pg = pgFromEnv({ user: 'app_admin', password: 'demo_password' })

// ---- copy ------------------------------------------------------------------
const chapter = (n, title, ticket) => card({ eyebrow: `Mistake #${n}`, title, ticket })

const K1 = 'Mistake #1 · The wrong record'
const K2 = 'Mistake #2 · The whole table'
const K3 = 'Mistake #3 · The change you didn’t mean to make'

// ---- scenes -----------------------------------------------------------------
async function sceneTitle(d) {
  d.mark('title')
  await d.wait(4600)
}

async function sceneColors(d, page) {
  d.mark('scene: color-coded connections')
  await d.hideCard()
  const prod = page.locator('.list-item', { hasText: 'Acme Coffee — PRODUCTION' }).first()
  const staging = page.locator('.list-item', { hasText: 'Acme Coffee — Staging' }).first()
  await d.hover(prod)
  await d.spotlight([prod, staging], 4)
  await d.caption('Each saved connection has a color. Production is <b>red</b>, staging is <b>green</b>.', 'Know where you are', 3800)
  await d.clearSpotlights()
  await d.hideCaption(200)
  await d.click(prod)
  await d.wait(900)
  await d.click(page.getByRole('button', { name: 'Connect', exact: true }))
  await page.locator('.global-status-bar .statusbar.red').first().waitFor({ timeout: 20000 })
  await d.wait(1000)
  await d.spotlight('.global-status-bar', 1)
  await d.caption('Once connected, the status bar stays red on every tab. Production never looks like staging.', 'Know where you are', 4400)
  await d.clearSpotlights()
  await d.hideCaption()
}

async function sceneWrongRecord(d, page) {
  d.mark('chapter 1: wrong record')
  await d.card(chapter(1, 'Updating the wrong record',
    '<b>Ticket #4182</b> &nbsp;Please upgrade <b>Sarah Johnson</b> (sarah.johnson@gmail.com) to the Business plan.'), 4200)
  await d.hideCard()

  await d.click(page.locator('#tab-tables span.table-name', { hasText: /^customers$/ }).first(), { dbl: true })
  await page.locator('.tabulator-row').first().waitFor()
  await d.wait(900)
  await d.click('.table-filter button[title="Toggle Filter Type"]')
  await d.wait(300)
  await d.click(page.locator('.table-filter input:visible').first())
  await d.type("last_name ILIKE 'johns%'")
  await d.wait(250)
  await d.press('Enter', { badge: false })
  await page.waitForFunction(() => document.querySelectorAll('.tabulator-row').length === 2)
  await d.wait(800)

  const rows = page.locator('.tabulator-row')
  await d.spotlight([rows.nth(0), rows.nth(1)], 3)
  await d.caption('Two customers with almost the same name, one row apart.', K1, 3600)
  await d.clearSpotlights()

  // The slip: edit Sara Johnston's row instead of Sarah Johnson's.
  const wrongPlan = rows.nth(1).locator('.tabulator-cell[tabulator-field="plan"]')
  await d.caption('One row off: the double-click lands on <b>Sara Johnston</b> instead.', K1)
  await d.wait(600)
  await d.click(wrongPlan, { dbl: true })
  await d.wait(250)
  await page.keyboard.press('Control+A')
  await d.type('Business')
  await d.wait(200)
  await d.press('Enter', { badge: false })
  await d.wait(700)
  await d.moveTo(d.mouse.x + 160, d.mouse.y + 110)
  await d.spotlight(wrongPlan, 3)
  await d.caption('Nothing is saved yet. The edit is <b>staged</b> and highlighted until you click Apply.', K1, 4200)
  await d.clearSpotlights()

  // Review the SQL before applying.
  await d.click('.global-status-bar x-buttons.pending-changes > x-button[menu]')
  await d.wait(500)
  await d.click(page.locator('x-menuitem', { hasText: 'Copy to SQL' }))
  await page.locator('.cm-line:visible', { hasText: '1182' }).first().waitFor()
  await d.wait(900)
  await d.spotlightText(page.locator('.cm-line:visible', { hasText: '1182' }).first(), 6)
  await d.caption('<b>Copy to SQL</b> shows the exact statement. <code>"id" = 1182</code> is Sara Johnston. Wrong customer!', 'Review before you apply', 5200)
  await d.clearSpotlights()

  await d.click(page.locator('.nav-item', { hasText: 'customers' }).first())
  await d.wait(600)
  const reset = page.locator('.global-status-bar').getByRole('button', { name: 'Reset' })
  await d.hover(reset)
  await d.caption('<b>Reset</b> throws the edit away. Production never saw it.', K1)
  await d.wait(1200)
  await d.click(reset)
  await d.wait(1800)

  // The right row this time.
  const rightPlan = rows.nth(0).locator('.tabulator-cell[tabulator-field="plan"]')
  await d.caption('Now the right row: Sarah Johnson, id 1181.', K1)
  await d.click(rightPlan, { dbl: true })
  await d.wait(250)
  await page.keyboard.press('Control+A')
  await d.type('Business')
  await d.wait(200)
  await d.press('Enter', { badge: false })
  await d.wait(900)
  const apply = page.locator('.global-status-bar x-buttons.pending-changes > x-button').first()
  await d.hover(apply)
  await d.caption('Click <b>Apply</b> to save. All staged edits are written in one transaction.', K1)
  await d.wait(1200)
  await d.click(apply)
  await d.wait(3200)
  await d.hideCaption()
}

async function sceneWholeTable(d, page) {
  d.mark('chapter 2: whole table')
  await d.card(chapter(2, 'Deleting a whole table by mistake',
    '<b>Ticket #4190</b> &nbsp;Order <b>#18412</b> was submitted twice. Please delete the duplicate.'), 4200)
  await d.hideCard()

  await d.click(page.locator('.nav-item', { hasText: 'Query #1' }).first())
  await d.wait(600)
  const manual = page.locator('#commit-mode:visible').getByText('Manual', { exact: true })
  await d.hover(manual)
  await d.caption('First, switch the editor to <b>Manual commit</b>. Writes stay in a transaction until you commit them.', K2)
  await d.wait(1800)
  await d.click(manual)
  await d.wait(2600)
  await d.hideCaption()

  const firstLine = page.locator('.cm-line:visible').first()
  const lb = await d.box(firstLine)
  await d.click(firstLine, { dx: -lb.width / 2 + 60 })
  await page.keyboard.press('Control+A')
  await page.keyboard.press('Backspace')
  await d.type('DELETE FROM orders')
  await page.keyboard.press('Escape')
  await d.wait(500)
  await d.caption('Ctrl+Enter, a second too early. The WHERE clause isn’t typed yet…', K2)
  await d.wait(900)
  await d.press('Control+Enter')
  await page.locator('.transaction-indicator:visible').waitFor({ timeout: 15000 })
  await d.wait(1400)
  await d.spotlight(page.locator('.transaction-indicator:visible'), 5)
  await d.spotlight(page.locator('.global-status-bar').getByText(/affected/), 4)
  await d.caption('<b>18,437 orders deleted</b>. But they’re only gone inside the open transaction. Nothing is committed.', K2, 5000)
  await d.clearSpotlights()

  const rollback = page.locator('.btn-group:visible').getByText('Rollback', { exact: true })
  await d.hover(rollback)
  await d.caption('Click <b>Rollback</b>, and every order is back.', K2)
  await d.wait(1100)
  await d.click(rollback)
  await d.wait(2900)

  // Finish the statement properly.
  await d.click(page.locator('.cm-line:visible', { hasText: 'DELETE FROM orders' }).first(), { dx: 120 })
  await page.keyboard.press('End')
  await d.hideCaption(150)
  await d.type('\nWHERE id = 18412;')
  await page.keyboard.press('Escape')
  await d.wait(500)
  await d.press('Control+Enter')
  await page.locator('.global-status-bar').getByText(/^1 affected$|1 rows? affected/).first().waitFor({ timeout: 15000 }).catch(() => {})
  await d.wait(1200)
  await d.spotlight(page.locator('.global-status-bar').getByText(/affected/), 4)
  await d.caption('With the WHERE clause: <b>1 row affected</b>, exactly as expected.', K2, 3200)
  await d.clearSpotlights()
  const commit = page.locator('.btn-group:visible').getByText('Commit', { exact: true })
  await d.hover(commit)
  await d.caption('Only now, <b>Commit</b>.', K2)
  await d.wait(900)
  await d.click(commit)
  await d.wait(2600)
  await d.hideCaption()
  await d.click(page.locator('#commit-mode:visible').getByText('Auto', { exact: true }))
  await d.wait(600)

  // Destructive actions from the sidebar ask first.
  await d.click(page.locator('#tab-tables span.table-name', { hasText: /^orders$/ }).first(), { right: true })
  await d.wait(600)
  await d.click(page.locator('.BksContextMenu-item', { hasText: /^Truncate$/ }).first())
  const modal = page.locator('[data-modal="dropTruncateModal"]')
  await modal.waitFor()
  await d.wait(700)
  const cancel = modal.getByRole('button', { name: 'Cancel' })
  await d.spotlight(cancel, 5)
  await d.caption('Drop and Truncate from the sidebar always ask first, with <b>Cancel</b> as the default.', K2, 4200)
  await d.clearSpotlights()
  await d.click(cancel)
  await d.wait(900)
  await d.hideCaption()
}

async function sceneReadOnly(d, page) {
  d.mark('chapter 3: read-only')
  await d.card(chapter(3, 'Making a change you didn’t mean to',
    '<b>Ticket #4193</b> &nbsp;Sarah Johnson says she was charged twice. Investigate only. Don’t change anything yet.'), 4200)
  await d.hideCard()

  await d.caption('Just investigating? Reconnect with <b>Read Only Mode</b> on.', K3)
  await d.click('.connection-button x-button')
  await d.wait(600)
  await d.click(page.locator('.connection-button x-menuitem', { hasText: 'Disconnect' }))
  const prod = page.locator('.list-item', { hasText: 'Acme Coffee — PRODUCTION' }).first()
  await prod.waitFor()
  await d.wait(900)
  await d.click(prod)
  await d.wait(800)
  const ro = page.locator('label[for="readOnlyMode"]')
  await d.hover(ro)
  await d.spotlight(ro, 6)
  await d.wait(900)
  await d.click(ro)
  await d.wait(1000)
  await d.clearSpotlights()
  await d.click(page.getByRole('button', { name: 'Connect', exact: true }))
  await page.locator('.global-status-bar .statusbar.red').first().waitFor({ timeout: 20000 })
  await d.wait(1200)
  await d.hideCaption(150)

  // Table edits are off.
  await d.click(page.locator('.nav-item', { hasText: 'customers' }).first())
  await page.locator('.tabulator-row').first().waitFor()
  await d.wait(700)
  await d.click(page.locator('.tabulator-row').first().locator('.tabulator-cell[tabulator-field="plan"]'), { dbl: true })
  await d.wait(700)
  await d.spotlight(page.locator('.global-status-bar .item-notice').first(), 6)
  await d.caption('Double-click a cell: nothing happens. Table editing is switched off, and the status bar says so.', K3, 4600)
  await d.clearSpotlights()

  // A leftover statement in the editor + Run All.
  await d.click(page.locator('.nav-item', { hasText: 'Query #1' }).first())
  await d.wait(700)
  await d.click(page.locator('.cm-line:visible', { hasText: '18412' }).first(), { dx: 40 })
  await page.keyboard.press('Control+End')
  await d.hideCaption(150)
  await d.type('\n\nSELECT * FROM orders WHERE customer_id = 1181;')
  await page.keyboard.press('Escape')
  await d.wait(400)
  await d.caption('That DELETE from earlier is still in the editor, and Ctrl+Enter runs <b>everything</b>…', K3)
  await d.wait(1800)
  await d.press('Control+Enter')
  await page.locator('.error-alert:visible').waitFor({ timeout: 15000 })
  await d.wait(900)
  await d.spotlight(page.locator('.error-alert:visible'), 6)
  await d.caption('…but Read Only Mode blocks writes before they reach the database.', K3, 4400)
  await d.clearSpotlights()

  // Reads still work: run just the SELECT.
  const select = page.locator('.cm-line:visible', { hasText: 'SELECT * FROM orders' }).first()
  await d.click(select, { dx: 260 })
  await page.keyboard.press('End')
  await page.keyboard.press('Shift+Home')
  await d.wait(500)
  await d.caption('Reads still work. Select the query and run it. Investigating stays safe.', K3)
  await d.press('Control+Enter')
  await page.locator('.result-table .tabulator-row, .result-table .tabulator-cell').first().waitFor({ timeout: 15000 }).catch(() => {})
  await d.wait(3400)
  await d.hideCaption()
}


async function sceneRecap(d) {
  d.mark('recap')
  await d.card(card({
    logo: true,
    eyebrow: 'Beekeeper Studio',
    title: 'Guardrails for production',
    bullets: [
      'Color-coded connections, so you always know where you are',
      'Staged table edits and Copy to SQL: review before you Apply',
      'Manual commit: Rollback undoes the oops',
      'Confirmation before Drop and Truncate',
      'Read Only Mode for when you’re just looking',
    ],
    footer: 'beekeeperstudio.io',
  }), 6500)
}

// ---- run --------------------------------------------------------------------
const connection = (name, database, color) => postgresConnection({
  name, database, color,
  host: pg.host === '127.0.0.1' ? 'localhost' : pg.host, port: pg.port, user: pg.user, password: pg.password,
})

await runDemo({
  name: 'beekeeper-production-safety-demo',
  outDir: here(import.meta.url, 'out'),
  setup: () => reseed(pg, { databases: ['acme_production', 'acme_staging'], seedFile: here(import.meta.url, 'seed.sql') }),
  prepare: ({ page }) => prepareProfile(page, {
    connections: [
      connection('Acme Coffee — PRODUCTION', 'acme_production', 'red'),
      connection('Acme Coffee — Staging', 'acme_staging', 'green'),
    ],
  }),
  // This video predates circled clicks; keep its look.
  director: { marks: false },
  title: card({
    logo: true,
    eyebrow: 'Beekeeper Studio',
    title: 'Fix production data<br>without the panic',
    text: 'You’re a software engineer, not a DBA. Here’s how Beekeeper Studio stops three classic mistakes before they happen.',
  }),
  titleText: 'Fix production data without the panic. You’re a software engineer, not a DBA. Here’s how Beekeeper Studio stops three classic mistakes before they happen.',
  scenes: [
    ({ d }) => sceneTitle(d),
    ({ d, page }) => sceneColors(d, page),
    ({ d, page }) => sceneWrongRecord(d, page),
    ({ d, page }) => sceneWholeTable(d, page),
    ({ d, page }) => sceneReadOnly(d, page),
    ({ d }) => sceneRecap(d),
  ],
  chapters: {
    'title': 'Intro',
    'scene: color-coded connections': 'Know which database you are in',
    'chapter 1: wrong record': 'Mistake #1: Updating the wrong record',
    'chapter 2: whole table': 'Mistake #2: Deleting a whole table',
    'chapter 3: read-only': 'Mistake #3: A change you didn’t mean to make',
    'recap': 'Recap',
  },
})

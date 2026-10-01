// Prepare a fresh TEST_MODE profile before recording: dismiss first-run
// prompts, start the built-in trial and create saved connections.

// localStorage flags for one-time tips that would clutter a recording.
export const FIRST_RUN_TIPS = ['hasUsedTransactions']

// Saved-connection fields for a Postgres connection. labelColor is one of
// default, red, orange, yellow, green, blue, purple, pink.
export function postgresConnection({ name, database, color = 'default', host = 'localhost', port = 5432, user, password, readOnly = false }) {
  return {
    connectionType: 'postgresql', name, host, port: Number(port), username: user, password,
    defaultDatabase: database, labelColor: color, readOnlyMode: readOnly, savePassword: true,
  }
}

export async function prepareProfile(page, { trial = true, connections = [], skipTips = FIRST_RUN_TIPS } = {}) {
  await page.waitForSelector('text=New Connection', { timeout: 60000 })
  await page.getByText("Don't show again").click({ timeout: 4000 }).catch(() => {})
  await page.evaluate(async ({ trial, connections, skipTips }) => {
    for (const key of skipTips) localStorage.setItem(key, 'true')
    const vm = document.querySelector('.style-wrapper').__vue__.$root
    const store = vm.$store
    // Paid features (e.g. SQL blocking in Read Only Mode) need a trial or license.
    if (trial && store.getters.isCommunity) await store.dispatch('licenses/add', { trial: true })
    for (const init of connections) {
      const conn = await vm.$util.send('appdb/saved/new', { init })
      Object.assign(conn, init)
      await store.dispatch('data/connections/save', conn)
    }
  }, { trial, connections, skipTips })
  // Let toasts such as "trial started" go away on their own.
  await page.waitForFunction(() => document.querySelectorAll('.noty_bar').length === 0, null, { timeout: 20000 }).catch(() => {})
  await page.waitForTimeout(500)
}

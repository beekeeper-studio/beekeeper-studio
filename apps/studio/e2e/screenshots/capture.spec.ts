/**
 * Screenshot capture spec (not a pass/fail test).
 *
 * Drives the real Electron app: connects to a dockerized database, switches to the
 * dark theme, zooms the UI a little, and captures three views per DB:
 *   1. query editor with results
 *   2. table data view with the JSON sidebar open
 *   3. table structure view
 *
 * Output PNGs go to e2e/screenshots/output/. Run under xvfb on headless Linux:
 *   yarn lib:build && yarn workspace beekeeper-studio build
 *   xvfb-run -a --server-args="-screen 0 1920x1200x24" \
 *     cross-env TEST_MODE=1 ELECTRON_DISABLE_SANDBOX=1 ELECTRON_EXTRA_LAUNCH_ARGS=--disable-gpu \
 *     SCREENSHOT_DBS=postgres yarn playwright test e2e/screenshots/capture.spec.ts --config=playwright.config.ts
 */
import { test, ElectronApplication, Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { launchElectron } from "e2e/helpers/launchElectron";
import { userActions } from "../pageActions/index";
import { NewDatabaseConnection } from "../pageComponents/NewDatabaseConnection";
import { QueryTab } from "../pageComponents/QueryTab";
import { selectedDbs, ScreenshotDbConfig } from "./configs";

const OUTPUT_DIR = path.join(__dirname, "output");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const WIDTH = 1600;
const HEIGHT = 1000;
const ZOOM = 1.15;

// The Vue root replaces the #app mount node with `.style-wrapper`, so #app is
// unreliable. Each in-page snippet below finds the root instance by scanning for
// whichever element carries `__vue__` (Playwright-injected fns bypass page CSP,
// so no eval/new Function needed).

async function waitForStore(page: Page) {
  await page.waitForFunction(
    () => {
      for (const el of Array.from(document.querySelectorAll("body *"))) {
        if ((el as any).__vue__?.$root?.$store) return true;
      }
      return false;
    },
    undefined,
    { timeout: 30000 }
  );
}

async function setDarkTheme(page: Page) {
  await page.evaluate(async () => {
    let root: any = null;
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      if ((el as any).__vue__?.$root) { root = (el as any).__vue__.$root; break; }
    }
    if (root?.$store) {
      await root.$store.dispatch("settings/save", { key: "theme", value: "dark" });
    }
  });
  await page.waitForTimeout(500);
}

async function startTrial(page: Page) {
  // Create a local trial license (no network) then re-sync the license status.
  // Done via $util directly to avoid the $noty path in `licenses/add`, which can
  // throw and skip the follow-up sync.
  const edition = await page.evaluate(async () => {
    let root: any = null;
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      if ((el as any).__vue__?.$root) { root = (el as any).__vue__.$root; break; }
    }
    if (!root?.$store) return "no-store";
    try {
      await root.$util.send("license/createTrialLicense");
    } catch (e) {
      /* a license already exists from a previous run - fine */
    }
    await root.$store.dispatch("licenses/sync");
    return root.$store.getters["licenses/isUltimate"] ? "ultimate" : "community";
  });
  // eslint-disable-next-line no-console
  console.log(`[trial] edition after activation: ${edition}`);
  await page.waitForTimeout(1000);
}

async function zoomIn(app: ElectronApplication) {
  await app.evaluate(({ BrowserWindow }, factor) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) win.webContents.setZoomFactor(factor);
  }, ZOOM);
}

// Remove the persistent "free trial expires" Noty (and any other toasts) so they
// don't clutter the corner of the screenshots.
async function dismissToasts(page: Page) {
  await page.evaluate(() => {
    document
      .querySelectorAll('.noty_bar, [id^="noty_layout"], .noty_layout')
      .forEach((n) => n.remove());
  });
}

async function jsonViewerOpen(page: Page): Promise<boolean> {
  return page
    .getByPlaceholder(/Filter keys/i)
    .first()
    .isVisible()
    .catch(() => false);
}

async function shot(page: Page, name: string) {
  await dismissToasts(page);
  const file = path.join(OUTPUT_DIR, name);
  await page.screenshot({ path: file });
  // eslint-disable-next-line no-console
  console.log(`[screenshot] ${file}`);
}

async function captureForDb(cfg: ScreenshotDbConfig) {
  const app = await launchElectron();
  const page = await app.firstWindow();
  const userAttemptsTo: any = userActions(page);
  const conn = new NewDatabaseConnection(page);
  const queryTab = new QueryTab(page);

  try {
    // Wait for the Vue root + store to be mounted before touching either.
    await waitForStore(page);
    // Dark theme before we connect so every view is captured dark.
    await setDarkTheme(page);
    // Unlock paid features (JSON sidebar) up front.
    await startTrial(page);

    // Connect.
    await userAttemptsTo.selectNewConnection(cfg.connectionType);
    await userAttemptsTo.insertDatabaseDetails(cfg);
    await userAttemptsTo.connectWithDatabase();
    await queryTab.queryTabTextArea.waitFor({ state: "visible", timeout: 30000 });

    // Re-apply dark theme after connecting (the connection screen and core
    // interface mount separately) and zoom the UI in a little.
    await setDarkTheme(page);
    await zoomIn(app);
    await page.waitForTimeout(800);

    // ---- View 1: query editor with results ----
    await userAttemptsTo.writeAQuery(cfg.query);
    await userAttemptsTo.runQuery();
    await page
      .getByRole("gridcell", { name: "1", exact: true })
      .first()
      .waitFor({ state: "visible", timeout: 30000 });
    await page.waitForTimeout(800);
    await shot(page, `beekeeper-${cfg.name}-query-editor.png`);

    // ---- View 2: table data view + JSON sidebar ----
    const tableItem = page
      .locator("span.table-name.truncate", { hasText: cfg.sampleTable })
      .first();
    await tableItem.scrollIntoViewIfNeeded();
    await tableItem
      .locator('xpath=ancestor::span[contains(@class,"item-wrapper")]')
      .dblclick();
    // Wait for the data grid of the opened table (scope to visible rows; the
    // inactive query-result tab also has .tabulator-row elements).
    const visibleRow = page.locator(".tabulator-row:visible").first();
    await visibleRow.waitFor({ state: "visible", timeout: 30000 });
    await page.waitForTimeout(500);

    // Select a data cell and use its "See details" context-menu action, which
    // opens the JSON viewer secondary sidebar populated with that row (see
    // TableTable.vue -> AppEvent.selectSecondarySidebarTab/toggleSecondarySidebar).
    const cell = visibleRow.locator(".tabulator-cell").nth(2);
    await cell.click();
    await page.waitForTimeout(200);
    await cell.click({ button: "right" });
    await page.waitForTimeout(300);
    try {
      await page.getByText("See details", { exact: false }).first().click({ timeout: 5000 });
    } catch (e) {
      // Fallback: open the JSON viewer sidebar directly via the root events.
      await page.evaluate(() => {
        let root: any = null;
        for (const el of Array.from(document.querySelectorAll("body *"))) {
          if ((el as any).__vue__?.$root) { root = (el as any).__vue__.$root; break; }
        }
        root?.$emit("selectSecondarySidebarTab", "json-viewer");
        root?.$emit("toggleSecondarySidebar", true);
      });
    }
    await page.waitForTimeout(1000);
    await shot(page, `beekeeper-${cfg.name}-table-json-sidebar.png`);

    // ---- View 3: table structure ----
    // Close the secondary (JSON viewer) sidebar so the structure view is clean.
    await page.evaluate(() => {
      let root: any = null;
      for (const el of Array.from(document.querySelectorAll("body *"))) {
        if ((el as any).__vue__?.$root) { root = (el as any).__vue__.$root; break; }
      }
      try {
        root?.$store?.dispatch("sidebar/setSecondarySidebarOpen", false);
      } catch (e) {
        /* ignore */
      }
      root?.$emit("toggleSecondarySidebar", false);
    });
    await page.waitForTimeout(400);
    await tableItem.click({ button: "right" });
    await page.waitForTimeout(400);
    try {
      await page.getByText("View Structure", { exact: false }).first().click({ timeout: 5000 });
    } catch (e) {
      // Fallback: emit the open-table-properties event via the Vue root.
      await page.evaluate((tableName) => {
        let root: any = null;
        for (const el of Array.from(document.querySelectorAll("body *"))) {
          if ((el as any).__vue__?.$root) { root = (el as any).__vue__.$root; break; }
        }
        root?.$emit("loadTableProperties", { table: { name: tableName } });
      }, cfg.sampleTable);
    }
    await page.waitForTimeout(1500);
    await shot(page, `beekeeper-${cfg.name}-table-structure.png`);
  } finally {
    await app.close();
  }
}

test.describe.serial("Capture DB screenshots", () => {
  for (const cfg of selectedDbs()) {
    test(`capture ${cfg.name}`, async () => {
      test.setTimeout(180000);
      await captureForDb(cfg);
    });
  }
});

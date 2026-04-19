import { _electron as electron } from 'playwright';

export async function launchElectron(options?: { testMode?: boolean }) {
  const env = { ...process.env };

  // Disable DEBUG to prevent dev tools from opening
  delete env.DEBUG;

  // NOTE: TEST_MODE causes config path issues (resolves to monorepo root instead of apps/studio/)
  // Only enable if explicitly requested
  if (options?.testMode === true) {
    env.TEST_MODE = 'true';
  }

  const app = await electron.launch({
    args: ['dist/main.js'],
    env
  });

  const window = await app.firstWindow();

  // Set larger window size so modal doesn't cover Connect button
  await window.setViewportSize({ width: 1600, height: 1000 });

  // Wait a bit for app to fully initialize, then close dev tools
  await new Promise(resolve => setTimeout(resolve, 1000));

  try {
    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows().forEach(win => {
        if (win.webContents.isDevToolsOpened()) {
          win.webContents.closeDevTools();
        }
      });
    });
  } catch (e) {
    // Dev tools not open or couldn't close
  }

  // Dismiss welcome modal if it appears
  try {
    await window.getByText("Don't show again", { exact: false }).click({ timeout: 500 });
  } catch (e) {
    // Modal not present, continue
  }

  // Dismiss product tour if it appears (AI Shell popup)
  try {
    const tourNextButton = window.locator('.driver-popover-next-btn, button:has-text("Okay")').first();
    if (await tourNextButton.isVisible({ timeout: 500 })) {
      await tourNextButton.click();
    }
  } catch (e) {
    // Tour not present, continue
  }

  return app;
}

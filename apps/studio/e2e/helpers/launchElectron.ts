import { _electron as electron } from 'playwright';

export async function launchElectron() {
  const app = await electron.launch({
    args: ['dist/main.js'],
    env: {
      ...process.env,
      TEST_MODE: 'true'
    }
  });

  const window = await app.firstWindow();

  // Set larger window size so modal doesn't cover Connect button
  await window.setViewportSize({ width: 1600, height: 1000 });

  // Dismiss welcome modal if it appears
  try {
    const dontShowButton = window.getByText("Don't show again");
    if (await dontShowButton.isVisible({ timeout: 2000 })) {
      await dontShowButton.click();
    }
  } catch (e) {
    // Modal not present, continue
  }

  return app;
}

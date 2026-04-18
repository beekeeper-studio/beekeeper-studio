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

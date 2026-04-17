import { _electron as electron } from 'playwright';

export async function launchElectron() {
  const app = await electron.launch({
    args: ['dist/main.js'],
    env: {
      ...process.env,
      TEST_MODE: 'true'
    }
  });

  // Make window wider so welcome modal doesn't cover Connect button
  const window = await app.firstWindow();
  await window.setViewportSize({ width: 1400, height: 900 });

  return app;
}

import { _electron as electron } from 'playwright';

export async function launchElectron() {

  const app = await electron.launch({
    args: ['dist/main.js'],
    env: process.env
  });

  const win = await app.firstWindow();

  await win.setViewportSize({ width: 1600, height: 1000 });

  await new Promise(resolve => setTimeout(resolve, 1000));

  try {
    await win.getByText("Don't show again", { exact: false }).click({ timeout: 500 })
  } catch(e) {

  }

  // A fresh install auto-starts the free trial and opens a welcome dialog;
  // dismiss it so the connection screen is clickable.
  try {
    await win.getByRole('button', { name: 'Start exploring' }).click({ timeout: 1500 })
  } catch(e) {

  }

  return app;
}

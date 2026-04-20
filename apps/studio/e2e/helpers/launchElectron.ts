import { _electron as electron } from 'playwright';

export async function launchElectron() {

  const app = await electron.launch({
    args: ['dist/main.js'],
    env: process.env
  });

  const win = await app.firstWindow();

  await new Promise(resolve => setTimeout(resolve, 1000));

  try {
    await win.getByText("Don't show again", { exact: false }).click({ timeout: 500 })
  } catch(e) {

  }

  return app;
}

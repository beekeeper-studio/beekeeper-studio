import { _electron as electron } from 'playwright';

export async function launchElectron() {
  return await electron.launch({
    args: ['dist/main.js'],
    env: {
      ...process.env,
      TEST_MODE: 'true'
    }
  });
}

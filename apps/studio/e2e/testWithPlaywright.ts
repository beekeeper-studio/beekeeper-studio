// "forked" from https://github.com/nklayman/vue-cli-plugin-electron-builder/blob/v3/lib/testWithPlaywright.js
// Distributed under MIT license: https://github.com/nklayman/vue-cli-plugin-electron-builder/blob/master/LICENSE

import { _electron as electron, ElectronApplication } from "@playwright/test";
import { execa } from "execa";

export default function testWithPlaywright(): Promise<{
  stdout: string;
  url: string;
  app: ElectronApplication;
  stop: () => Promise<void>;
}> {
  return new Promise((resolve, reject) => {
    let log = "";
    let outputDir = "";
    // Launch electron:serve in headless mode
    const child = execa(
      require.resolve("@vue/cli-service/bin/vue-cli-service"),
      ["electron:serve", "--headless", "--mode", "production"],
      {
        extendEnv: false,
        env: {
          ...process.env,
          // Extending NODE_ENV causes warnings with build
          NODE_ENV: undefined,
        },
      }
    );

    // Exit if electron:serve throws an error
    child.on("error", (err: any) => {
      reject(err);
    });

    child.stdout.on("data", async (data) => {
      data = data.toString();
      console.log(data);
      log += data;
      const urlMatch = data.match(
        /\$WEBPACK_DEV_SERVER_URL=https?:\/\/[^/]+\/?/
      );
      const outputDirMatch = data.match(/\$outputDir=\b.*\b/);
      if (outputDirMatch) {
        // Record output dir
        outputDir = outputDirMatch[0].split("=")[1];
      }
      if (urlMatch) {
        // Record url and launch app
        const url = urlMatch[0].split("=")[1];
        let app: ElectronApplication;
        // Launch app with playwright
        app = await electron.launch({
          args: [`${outputDir}`],
          env: {
            ...process.env,
            IS_TEST: "true",
            WEBPACK_DEV_SERVER_URL: url,
            TEST_MODE: "true",
            DEBUG: "",
          },
        });
        resolve({
          stdout: log,
          url,
          app,
          stop: () => {
            // Exit serve process
            child.stdin.write("close");
            child.kill("SIGKILL");
            // Close playwright
            return app.close();
          },
        });
      }
    });
  });
}

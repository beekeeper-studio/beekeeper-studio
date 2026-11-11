import type { RegistryConfig, ThemeManifest } from "@/services/plugin";
import defaultTheme from "../../public/themes/default/manifest.json";
import solarizedTheme from "../../public/themes/solarized/manifest.json";
import draculaTheme from "../../public/themes/dracula/manifest.json";
import githubTheme from "../../public/themes/github/manifest.json";
import urbanSundownTheme from "../../public/themes/urban-sundown/manifest.json";

export default {
  updateCheckInterval: 1000 * 60 * 60 * 24, // 24 hours
  freeTrialDays: 14,
  psqlTimeout: 15000, // 15 seconds
  psqlIdleTimeout: 20000,
  defaultChunkSize: 100,
  maxDetailViewTextLength: 30,
  bigTableColumnWidth: 125,
  maxColumnWidthTableInfo: 300,
  workspaceCheckInterval: 5000, // 5 seconds
  dataCheckInterval: 1000 * 30, // 30 secs
  trialNotificationInterval: 1000 * 60 * 60 * 12, // 12 hours
  licenseCheckInterval: 1000 * 60 * 10, // once per 10 minutes
  errorNoticeTimeout: 60 * 1000, // 1 minute
  tableListItemHeight: 22.8, // in pixels
  // for azure auth
  pollingTimeout: 60 * 1000, // 1 minute
  clientId: '6eabc37c-bcc5-41fa-9a90-f6c5ab2aabcb',
  iamRefreshTime: 13 * 60 * 1000, // 13 minutes
  iamExpiryTime: 15 * 60 * 1000, // 15 minutes
  iamRefreshBeforeTime: 2 * 60 * 1000, // 2 minutes
  azureCloudTokenUrl: 'https://app.beekeeperstudio.io/api/cloud_tokens',
  azureCloudScopes: ['https://database.windows.net/.default', 'offline_access'],
  firebird: {
    poolSize: 5,
  },
  plugins: {
    /**
     * Ensure these packages are bundled and installed for first time users.
     *
     * @see `BundledPluginModule` in src/services/plugin/modules/BundledPluginModule.ts
     **/
    ensureInstalled: [
      { id: "bks-ai-shell", pkg: "@beekeeperstudio/bks-ai-shell" },
      { id: "bks-er-diagram", pkg: "@beekeeperstudio/bks-er-diagram" },
    ],
    maxCommunityPlugins: 2,
    registries: [
      {
        name: "official",
        origin: "official",
        owner: "beekeeper-studio",
        repo: "beekeeper-studio-plugins",
        file: "plugins.json"
      },
      {
        name: "community",
        origin: "community",
        owner: "beekeeper-studio",
        repo: "beekeeper-studio-plugins",
        file: "community-plugins.json"
      },
    ] satisfies RegistryConfig[],
  },
  themes: {
    bundled: [
      defaultTheme,
      solarizedTheme,
      draculaTheme,
      githubTheme,
      urbanSundownTheme,
    ] satisfies ThemeManifest[],
    registries: [
      {
        name: "community-themes",
        origin: "community",
        owner: "beekeeper-studio",
        repo: "beekeeper-studio-plugins",
        file: "community-themes.json"
      },
    ] satisfies RegistryConfig[],
  },
}



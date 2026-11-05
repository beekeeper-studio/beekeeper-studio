<template>
  <base-modal
    :name="modalName"
    :loading="activePageId === 'plugins' && loadingPlugins"
    @before-open="loadThemeEntries"
    first-focusable="input[name='theme-mode']:checked"
    min-width="50rem"
    max-width="50rem"
    height="46rem"
  >
    <config v-model="activePageId">
      <config-page
        id="themes"
        title="Themes"
        icon="palette"
      >
        <template #default="{ open }">
          <config-item
            fieldset
            label="Theme mode"
          >
            <span class="mode-options">
              <label class="mode-option">
                <input
                  type="radio"
                  name="theme-mode"
                  class="visually-hidden"
                  value="light"
                  :checked="themeAppearance === 'light'"
                  @change="setThemeDark('light')"
                >
                <span class="mode-option-content">Light</span>
              </label>
              <label class="mode-option">
                <input
                  type="radio"
                  name="theme-mode"
                  class="visually-hidden"
                  value="dark"
                  :checked="themeAppearance === 'dark'"
                  @change="setThemeDark('dark')"
                >
                <span class="mode-option-content">Dark</span>
              </label>
              <label class="mode-option">
                <input
                  type="radio"
                  name="theme-mode"
                  class="visually-hidden"
                  value="auto"
                  :checked="themeAppearance === 'auto'"
                  @change="setThemeDark('auto')"
                >
                <span class="mode-option-content">Auto</span>
              </label>
            </span>
          </config-item>
          <config-item
            fieldset
            direction="column"
            label="Available Themes"
          >
            <div class="theme-list">
              <label
                v-for="theme in listedThemes"
                :key="theme.manifest.id"
                class="theme-item"
                :class="{
                  selected: themeId === theme.manifest.id,
                  disabled: theme.disableState.disabled,
                }"
              >
                <span class="theme-name">
                  <input
                    type="radio"
                    name="theme-name"
                    :value="theme.manifest.id"
                    :checked="themeId === theme.manifest.id"
                    :disabled="theme.disableState.disabled"
                    @change="setThemeId(theme.manifest.id)"
                  >
                  <span class="theme-label">{{ theme.manifest.name }}</span>
                  <span
                    v-if="theme.origin !== 'bundled'"
                    @click.prevent.stop
                  >
                    <x-button
                      class="btn btn-icon"
                      title="More"
                      menu
                    >
                      <i class="material-icons">more_horiz</i>
                      <x-menu>
                        <x-menuitem @click="openThemePage(theme)">
                          <x-label>View</x-label>
                        </x-menuitem>
                        <x-menuitem @click="uninstallTheme(theme.manifest.id)">
                          <x-label>Uninstall</x-label>
                        </x-menuitem>
                      </x-menu>
                    </x-button>
                  </span>
                </span>
                <span class="theme-preview-frame">
                  <theme-preview
                    :theme-id="theme.manifest.id"
                    :appearance="themeAppearance"
                  />
                </span>
              </label>
            </div>
          </config-item>
          <config-item
            label="Get More Themes"
            helper="Themes made and shared by the community."
          >
            <button
              type="button"
              class="btn btn-flat"
              @click="open('community-themes')"
            >
              Browse…
            </button>
          </config-item>
          <config-item
            label="Theme Configuration"
            helper="Updates, community and unlisted themes."
          >
            <button
              type="button"
              class="btn btn-flat"
              @click="open('theme-config')"
            >
              Configure…
            </button>
          </config-item>
          <config-page
            id="community-themes"
            title="Themes"
            :loading="loadingEntries"
          >
            <template>
              <div
                v-if="themeEntriesError"
                class="alert alert-danger"
              >
                <i class="material-icons">error_outline</i>
                <div class="alert-body expand">
                  Community themes unavailable: {{ themeEntriesError }}
                </div>
                <button
                  type="button"
                  class="btn btn-flat"
                  @click="loadThemeEntries"
                >
                  Retry
                </button>
              </div>
              <plugin-list
                v-if="!themeEntriesError || displayThemes.length > 0"
                :plugins="displayThemes"
                search-placeholder="Search Themes"
                :show-origin-filter="false"
                @install="installTheme"
                @item-click="openEntryPage"
              />
            </template>
          </config-page>
          <config-page
            id="theme-detail"
            :title="selectedTheme ? selectedTheme.name : ''"
            :loading="loadingThemeReadme"
          >
            <template>
              <extension-page
                v-if="selectedTheme"
                :extension="selectedTheme"
                :extension-repo="selectedThemeRepo"
                :loading-markdown="loadingThemeReadme"
                @install="installTheme(selectedTheme)"
                @uninstall="uninstallTheme(selectedTheme.id)"
                @update="installTheme(selectedTheme)"
                @checkForUpdates="checkThemeForUpdates(selectedTheme)"
              />
            </template>
          </config-page>
          <config-page
            id="theme-config"
            title="Theme Configuration"
          >
            <config-item
              label="Auto update"
              helper="Allow themes to be automatically updated on application launch."
            >
              <x-switch
                @click.prevent="themeAutoUpdate = !themeAutoUpdate"
                :toggled="themeAutoUpdate"
              />
            </config-item>
            <config-item
              label="Community Themes"
              helper="Community themes are developed and maintained by independent third parties, not by Beekeeper Studio. Use at your own risk."
            >
              <x-switch
                @click.prevent="communityThemesEnabled = !communityThemesEnabled"
                :toggled="communityThemesEnabled"
              />
            </config-item>
            <config-item
              label="Unlisted Themes"
              helper="Enable unlisted themes. These are themes not found in a registry, just placed in your themes directory manually."
            >
              <x-switch
                @click.prevent="unlistedThemesEnabled = !unlistedThemesEnabled"
                :toggled="unlistedThemesEnabled"
              />
            </config-item>
          </config-page>
        </template>
      </config-page>
      <config-page
        id="plugins"
        title="Plugins"
        icon="extension"
      >
        <template #default="{ open }">
          <div class="plugin-manager-content">
            <plugin-disabled-overlay v-if="$bksConfig.pluginSystem.disabled" />
            <div
              v-if="!optInAlertDismissed"
              class="alert alert-info"
            >
              <i class="material-icons-outlined">info</i>
              <div class="alert-body expand">
                Official and community plugins are off by default. Turn them
                on in Plugin Configuration to see more plugins.
              </div>
              <button
                type="button"
                class="btn btn-flat"
                @click="highlightOptIn = true; open('plugin-config')"
              >
                Configure…
              </button>
              <button
                type="button"
                class="btn btn-icon"
                title="Dismiss"
                @click="dismissOptInAlert"
              >
                <i class="material-icons">close</i>
              </button>
            </div>
            <div class="alerts">
              <error-alert :error="errors" />
            </div>
            <config-item
              label="Plugin Configuration"
              helper="Registries, updates and GitHub rate limits."
            >
              <button
                type="button"
                class="btn btn-flat"
                @click="open('plugin-config')"
              >
                Configure…
              </button>
            </config-item>
            <h3>Available Plugins</h3>
            <plugin-list
              class="remote-plugin-list"
              :plugins="sortedPlugins"
              @install="install"
              @uninstall="uninstall"
              @update="update"
              @item-click="openPluginPage"
              @checkForUpdates="checkForUpdates"
            />
          </div>
          <config-page
            id="plugin-detail"
            :title="selectedPlugin ? selectedPlugin.name : ''"
            :loading="loadingPluginReadme"
          >
            <template>
              <extension-page
                v-if="selectedPlugin"
                :extension="selectedPlugin"
                :extension-repo="selectedPluginRepo"
                :loading-markdown="loadingPluginReadme"
                @install="install(selectedPlugin)"
                @uninstall="uninstall(selectedPlugin)"
                @update="update(selectedPlugin)"
                @checkForUpdates="checkForUpdates(selectedPlugin)"
              >
                <template #settings>
                  <label class="checkbox-group">
                    <input
                      type="checkbox"
                      :checked="autoUpdateEnabled"
                      @change="toggleAutoUpdate"
                    >
                    <span>Auto-update</span>
                  </label>
                  <label
                    class="checkbox-group"
                    v-tooltip="'Only allow this plugin to run Read Only queries against your database'"
                  >
                    <input
                      type="checkbox"
                      :checked="pluginReadOnly"
                      @change="toggleReadOnly"
                    >
                    <span>Read-Only</span>
                  </label>
                </template>
                <template #alerts>
                  <disable-state-alert :id="selectedPlugin.id" type="plugin" />
                  <div
                    class="alert alert-danger"
                    v-if="!selectedPlugin.loadable && selectedPlugin.installed"
                  >
                    <i class="material-icons">error_outline</i>
                    <div class="alert-body expand">
                      <span>This plugin was not loaded because it requires Beekeeper Studio {{ selectedPlugin.minAppVersion }}+. Please upgrade the app or <a href="https://docs.beekeeperstudio.io/user_guide/plugins/#installing-a-specific-plugin-version">install a compatible plugin version</a>.</span>
                    </div>
                  </div>
                </template>
              </extension-page>
            </template>
          </config-page>
          <config-page
            id="plugin-config"
            title="Plugin Configuration"
          >
            <config-item
              label="Auto update"
              helper="Allow plugins to be automatically updated on application launch."
            >
              <x-switch
                @click.prevent="autoUpdate = !autoUpdate"
                :toggled="autoUpdate"
              />
            </config-item>
            <config-item
              label="Official Plugins"
              :highlighted="highlightOptIn"
              helper="Official Plugins are built and maintained by the Beekeeper Studio Team"
            >
              <x-switch
                @click.prevent="officialEnabled = !officialEnabled"
                :toggled="officialEnabled"
              />
            </config-item>
            <config-item
              label="Community Plugins"
              :highlighted="highlightOptIn"
              helper="Community plugins are developed and maintained by independent third parties, not by Beekeeper Studio. Use at your own risk."
            >
              <x-switch
                @click.prevent="communityEnabled = !communityEnabled"
                :toggled="communityEnabled"
              />
            </config-item>
            <config-item
              label="Custom Registries"
              helper="Enable custom registries to find plugins from. These can be configured in your ini file."
            >
              <x-switch
                @click.prevent="customEnabled = !customEnabled"
                :toggled="customEnabled"
              />
            </config-item>
            <config-item
              label="Unlisted Plugins"
              helper="Enable unlisted plugins. These are anonymous plugins not found in a registry, just placed in your plugin directory manually."
            >
              <x-switch
                @click.prevent="unlistedEnabled = !unlistedEnabled"
                :toggled="unlistedEnabled"
              />
            </config-item>
            <config-item
              label="Github Token"
              helper="Github requests are rate limited. If you find yourself running into issues, setting this will increase that limit."
            >
              <input
                type="password"
                :value="githubToken"
                @change="saveGithubToken($event.target.value)"
              >
            </config-item>
          </config-page>
        </template>
      </config-page>
    </config>
  </base-modal>
</template>

<script lang="ts">
import Vue from "vue";
import { mapActions, mapGetters, mapState } from "vuex";
import { AppEvent } from "@/common/AppEvent";
import BaseModal from "@/components/common/modals/BaseModal.vue";
import ThemePreview from "@/components/common/ThemePreview.vue";
import Config from "@/components/common/config/Config.vue";
import ConfigPage from "@/components/common/config/ConfigPage.vue";
import ConfigItem from "@/components/common/config/ConfigItem.vue";
import ExtensionPage from "@/components/plugins/ExtensionPage.vue";
import PluginList from "@/components/plugins/PluginList.vue";
import type { ExtensionRegistryEntry, ExtensionUI, ThemeSnapshot } from "@/services/plugin/types";
import rawLog from "@bksLogger";
import _ from "lodash";
import DisableStateAlert from "@/components/plugins/DisableStateAlert.vue";
import ErrorAlert from "@/components/common/ErrorAlert.vue";
import PluginDisabledOverlay from "@/components/plugins/PluginDisabledOverlay.vue";
import { PluginSystemError } from "@/lib/errors";
import { SmartLocalStorage } from "@/common/LocalStorage";
import type { PluginSnapshot, ExtensionOrigin } from "@/services/plugin";

const log = rawLog.scope("ConfigModal");

const ORIGIN_ORDER: Record<ExtensionOrigin, number> = {
  "official": 0,
  "community": 1,
  "custom": 2,
  "unlisted": 3,
  // This shouldn't happen, we exclude bundled from the list
  "bundled": Number.MAX_SAFE_INTEGER
};

const INSTALL_ORDER: Record<"true" | "false", number> = {
  "true": 0,
  "false": 10
}

const DISABLED_ORDER: Record<"true" | "false", number> = {
  "true": 20,
  "false": 0
}

export default Vue.extend({
  components: {
    BaseModal,
    ThemePreview,
    Config,
    ConfigPage,
    ConfigItem,
    ExtensionPage,
    PluginList,
    DisableStateAlert,
    PluginDisabledOverlay,
    ErrorAlert,
  },
  data() {
    return {
      modalName: "config-modal",
      activePageId: "themes",
      highlightOptIn: false,
      optInAlertDismissed: SmartLocalStorage.getBool(
        "pluginOptInAlertDismissed"
      ),
      selectedTheme: null as ExtensionUI | null,
      selectedThemeRepo: null,
      loadingThemeReadme: false,
      themeEntries: [] as ExtensionRegistryEntry[],
      themeEntriesError: null as string | null,
      loadingEntries: false,
      installingIds: [] as string[],
      installErrors: {} as Record<string, string>,
      plugins: [],
      selectedPluginIdx: -1,
      selectedPluginRepo: null,
      loadingPluginReadme: false,
      autoUpdateEnabled: true,
      pluginReadOnly: true,
      loadedPlugins: false,
      errors: null,
      loadingPlugins: false,
      optionsAreExpanded: false,
    };
  },
  computed: {
    ...mapGetters({
      themes: "theme/snapshots",
      themeId: "theme/id",
      themeAppearance: "theme/appearance",
    }),
    listedThemes(): ThemeSnapshot[] {
      return this.themes.filter((theme) => !theme.disableState.disabled);
    },
    installedIds(): string[] {
      return this.themes.map((theme) => theme.manifest.id);
    },
    displayThemes(): ExtensionUI[] {
      const list: ExtensionUI[] = [];

      for (const theme of this.themes as ThemeSnapshot[]) {
        if (theme.origin === "bundled") {
          continue;
        }

        const entry = this.themeEntries.find(
          (entry) => entry.id === theme.manifest.id
        );

        list.push({
          ...theme.manifest,
          origin: theme.origin,
          repo: entry?.repo ?? null,
          installed: true,
          installing: this.installingIds.includes(theme.manifest.id),
          enabled: true,
          loadable: true,
          checkingForUpdates: null,
          updateAvailable: false,
          error: this.installErrors[theme.manifest.id] ?? null,
          disabled: theme.disableState.disabled,
        } as ExtensionUI);
      }

      for (const entry of this.themeEntries) {
        if (this.installedIds.includes(entry.id)) {
          continue;
        }

        list.push({
          ...entry,
          installed: false,
          installing: this.installingIds.includes(entry.id),
          enabled: true,
          loadable: true,
          checkingForUpdates: null,
          updateAvailable: false,
          error: this.installErrors[entry.id] ?? null,
          disabled: false,
        } as ExtensionUI);
      }

      return list;
    },
    rootBindings() {
      return [
        { event: AppEvent.openAppearanceModal, handler: this.openAppearance },
        { event: AppEvent.openPluginManager, handler: this.openPlugins },
      ];
    },
    ...mapState(["pluginManagerStatus"]),
    ...mapState("plugins/snapshots", {
      snapshots: "all",
    }),
    ...mapState("settings", ["settings"]),
    ...mapGetters("plugins/entries", {
      entries: "all",
    }),
    ...mapGetters("plugins/snapshots", ['snapshotsById']),
    selectedPlugin() {
      return this.plugins[this.selectedPluginIdx];
    },
    sortedPlugins() {
      return _.sortBy(this.displayPlugins, this.pluginSorter);
    },
    displayPlugins(): ExtensionUI[] {
      return this.plugins.map((plugin) => ({
        ...plugin,
        disabled: this.snapshotsById[plugin.id]?.disableState.disabled
      }));
    },
    autoUpdate: {
      get() {
        return this.$bksConfig.pluginSystem.autoUpdate;
      },
      async set(value) {
        await this.$util.send('config/writeUserValue', { path: 'pluginSystem.autoUpdate', value });
      }
    },
    communityEnabled: {
      get() {
        return !this.$bksConfig.pluginSystem.communityDisabled;
      },
      async set(value) {
        if (value) {
          // do we only want to do this the first time they enable?
          const title = `Enable Community Plugins?`;
          const confirmation = `By enabling community plugins, you acknowledge that you understand ` +
          `that Beekeeper Studio does not review, test, endorse, or warrant community plugins, ` +
          `and any use of them is at your own risk.`;
          if (!(await this.$confirm(title, confirmation, { confirmLabel: 'Enable', variant: "danger" }))) {
            return;
          }
        }

        await this.$util.send('config/writeUserValue', { path: 'pluginSystem.communityDisabled', value: !value });
        await this.reinitPluginData();
        if (value) {
          this.dismissOptInAlert();
        }
      }
    },
    officialEnabled: {
      get() {
        return !this.$bksConfig.pluginSystem.officialDisabled;
      },
      async set(value) {
        await this.$util.send('config/writeUserValue', { path: 'pluginSystem.officialDisabled', value: !value });
        await this.reinitPluginData();
        if (value) {
          this.dismissOptInAlert();
        }
      }
    },
    customEnabled: {
      get() {
        return !this.$bksConfig.pluginSystem.thirdPartyRegistriesDisabled;
      },
      async set(value) {
        await this.$util.send('config/writeUserValue', { path: 'pluginSystem.thirdPartyRegistriesDisabled', value: !value });
        await this.reinitPluginData();
      }
    },
    unlistedEnabled: {
      get() {
        return !this.$bksConfig.pluginSystem.unlistedDisabled;
      },
      async set(value) {
        await this.$util.send('config/writeUserValue', { path: 'pluginSystem.unlistedDisabled', value: !value });
        await this.reinitPluginData();
      }
    },
    themeAutoUpdate: {
      get() {
        return this.$bksConfig.themeSystem.autoUpdate;
      },
      async set(value) {
        await this.$util.send("config/writeUserValue", {
          path: "themeSystem.autoUpdate",
          value,
        });
      },
    },
    communityThemesEnabled: {
      get() {
        return !this.$bksConfig.themeSystem.communityDisabled;
      },
      async set(value) {
        await this.$util.send("config/writeUserValue", {
          path: "themeSystem.communityDisabled",
          value: !value,
        });
        await this.loadThemes();
      },
    },
    unlistedThemesEnabled: {
      get() {
        return !this.$bksConfig.themeSystem.unlistedDisabled;
      },
      async set(value) {
        await this.$util.send("config/writeUserValue", {
          path: "themeSystem.unlistedDisabled",
          value: !value,
        });
        await this.loadThemes();
      },
    },
    githubToken() {
      return this.settings.pluginGithubToken?.value ?? "";
    }
  },
  watch: {
    activePageId() {
      if (this.activePageId !== "plugin-config") {
        this.highlightOptIn = false;
      }
    },
    pluginManagerStatus: {
      async handler() {
        if (this.pluginManagerStatus === "failed-to-initialize") {
          this.errors = ["Plugin system was not initialized properly. Please restart Beekeeper Studio to continue using plugins or report this issue."]
        } else {
          this.errors = null
        }

        if (this.pluginManagerStatus === "ready") {
          await this.loadPlugins();
        } else if (this.pluginManagerStatus === "initializing") {
          this.loadingPlugins = true;
        } else {
          this.loadingPlugins = false;
        }
      },
      immediate: true,
    }
  },
  mounted() {
    if (this.$plugin.failedToInitialize) {
      this.$noty.error("Failed to initialize plugin manager.");
    }
    this.registerHandlers(this.rootBindings);
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  },
  methods: {
    ...mapActions("theme", {
      setThemeDark: "setDark",
      setThemeId: "setId",
      loadThemes: "loadThemes",
    }),
    isIgnoredTheme(theme: ThemeSnapshot) {
      return theme.disableState.disabled && theme.disableState.reason === "bundled-id-conflict";
    },
    disabledReasonText(theme: ThemeSnapshot) {
      if (!theme.disableState.disabled) {
        return "";
      }
      return {
        "community-themes-disabled": "Community themes are off",
        "unlisted-theme-disabled": "Unlisted themes are off",
        "missing-style": "Missing style.css",
      }[theme.disableState.reason];
    },
    async checkThemeForUpdates({ id }: { id: string }) {
      this.selectedTheme = { ...this.selectedTheme, checkingForUpdates: true };
      try {
        const updateAvailable = await this.$util.send("theme/checkForUpdates", { id });
        this.selectedTheme = { ...this.selectedTheme, updateAvailable };
      } catch (e) {
        log.error(e);
        this.$noty.error(`Failed to check for update: ${e.message}`);
      } finally {
        this.selectedTheme = { ...this.selectedTheme, checkingForUpdates: false };
      }
    },
    async openThemePage(theme: ThemeSnapshot) {
      this.selectedThemeRepo = null;
      this.selectedTheme = {
        ...theme.manifest,
        origin: theme.origin,
        repo: null,
        installed: true,
        installing: false,
        enabled: true,
        loadable: true,
        error: null,
        updateAvailable: false,
        checkingForUpdates: null,
        disabled: false,
      };
      this.loadingThemeReadme = true;
      this.activePageId = "theme-detail";
      try {
        const { entries: registryMap } = await this.$util.send("theme/entries", {
          clearCache: false,
        });
        const entries: ExtensionRegistryEntry[] = Object.values(registryMap).flat();
        const entry = entries.find((e) => e.id === theme.manifest.id);
        if (entry) {
          this.selectedTheme = {
            ...this.selectedTheme,
            repo: entry.repo,
            origin: entry.origin,
          };
          this.selectedThemeRepo = await this.$util.send("theme/repository", {
            id: theme.manifest.id,
          });
        }
      } catch (e) {
        this.$noty.error(`Error opening theme page: ${e.message}`);
      }
      this.loadingThemeReadme = false;
    },
    async uninstallTheme(id: string) {
      const confirmed = await this.$confirm(
        "Are you sure you want to uninstall?",
        undefined,
        { confirmLabel: "Uninstall", variant: "danger" }
      );
      if (!confirmed) {
        return;
      }

      try {
        await this.$util.send("theme/uninstall", { id });
        this.activePageId = "themes";
        if (this.themeId === id) {
          await this.setThemeId("default");
        }
        await this.loadThemes();
      } catch (e) {
        this.$noty.error(`Failed to uninstall theme: ${e.message}`);
      }
    },
    dismissOptInAlert() {
      SmartLocalStorage.setBool("pluginOptInAlertDismissed", true);
      this.optInAlertDismissed = true;
    },
    openAppearance() {
      this.activePageId = "themes";
      this.$modal.show(this.modalName);
    },
    openPlugins() {
      this.activePageId = "plugins";
      this.$modal.show(this.modalName);
    },
    async loadThemeEntries() {
      this.loadingEntries = true;
      this.themeEntriesError = null;
      try {
        const { entries, errors } = await this.$util.send("theme/entries", {
          clearCache: true,
        });
        this.themeEntries = Object.values(entries).flat();
        this.themeEntriesError = errors.length > 0 ? errors.join("; ") : null;
      } catch (e) {
        this.themeEntriesError = e.message;
      }
      this.loadingEntries = false;
    },
    async openEntryPage(entry: ExtensionUI) {
      this.selectedTheme = entry;
      this.selectedThemeRepo = null;
      this.loadingThemeReadme = true;
      this.activePageId = "theme-detail";
      try {
        this.selectedThemeRepo = await this.$util.send("theme/repository", {
          id: entry.id,
        });
        const installed = this.themes.find((theme) => theme.manifest.id === entry.id);
        this.selectedTheme = {
          ...this.selectedTheme,
          version: installed?.manifest.version ?? this.selectedThemeRepo.latestRelease?.manifest.version,
        };
      } catch (e) {
        this.$noty.error(`Error opening theme page: ${e.message}`);
      }
      this.loadingThemeReadme = false;
    },
    async installTheme({ id }: { id: string }) {
      this.installingIds.push(id);
      this.$delete(this.installErrors, id);
      if (this.selectedTheme?.id === id) {
        this.selectedTheme = { ...this.selectedTheme, installing: true, error: null };
      }
      try {
        const manifest = await this.$util.send("theme/install", { id });
        await this.loadThemes();
        if (this.selectedTheme?.id === id) {
          this.selectedTheme = {
            ...this.selectedTheme,
            installed: true,
            version: manifest.version,
            updateAvailable: false,
          };
        }
      } catch (e) {
        this.$set(this.installErrors, id, e.message);
        if (this.selectedTheme?.id === id) {
          this.selectedTheme = { ...this.selectedTheme, error: e.message };
        }
        this.$noty.error(`Failed to install theme: ${e.message}`);
      } finally {
        this.installingIds = this.installingIds.filter(
          (installingId) => installingId !== id
        );
        if (this.selectedTheme?.id === id) {
          this.selectedTheme = { ...this.selectedTheme, installing: false };
        }
      }
    },
    async reinitPluginData() {
      if (this.pluginManagerStatus === "ready") {
        this.plugins = [];
        await this.$store.dispatch("plugins/initialize");
        await this.loadPlugins();
      }
    },
    async loadPlugins() {
      this.loadingPlugins = true;

      try {
        this.plugins = await this.buildPluginListData();
      } catch (e) {
        log.error(e);
      }

      this.loadingPlugins = false;
    },
    // grrr observability
    updatePlugin(id: string, updated: Partial<ExtensionUI>) {
      const idx = this.plugins.findIndex((p) => p.id === id);
      if (idx === -1) return;
      this.$set(this.plugins, idx, { ...this.plugins[idx], ...updated });
    },
    async install({ id }) {
      try {
        this.updatePlugin(id, { installing: true, error: null });
        await this.$plugin.install(id);
        this.updatePlugin(id, { installed: true, loadable: true });
      } catch (e) {
        log.error(e);
        this.updatePlugin(id, { error: e });
        this.$noty.error(`Failed to install plugin: ${e.message}`);
      } finally {
        this.updatePlugin(id, { installing: false });
      }
    },
    async update({ id }) {
      try {
        this.updatePlugin(id, { installing: true, error: null });
        const manifest = await this.$plugin.update(id);
        this.updatePlugin(id, {
          version: manifest.version,
          updateAvailable: false,
          loadable: true,
        });
      } catch (e) {
        log.error(e);
        this.updatePlugin(id, { error: e });
        this.$noty.error(`Failed to update plugin: ${e.message}`);
      } finally {
        this.updatePlugin(id, { installing: false });
      }
    },
    async checkForUpdates({ id }) {
      try {
        this.updatePlugin(id, { checkingForUpdates: true });
        this.updatePlugin(id, {
          updateAvailable: await this.$util.send("plugin/checkForUpdates", {
            id,
          }),
        });
      } catch (e) {
        log.error(e);
        this.$noty.error(`Failed to check for update: ${e.message}`);
      } finally {
        this.updatePlugin(id, { checkingForUpdates: false });
      }
    },
    async uninstall({ id }) {
      const confirmed = await this.$confirm(
        "Are you sure you want to uninstall?",
        undefined,
        { confirmLabel: "Uninstall", variant: "danger" }
      );
      if (!confirmed) {
        return;
      }

      try {
        await this.$plugin.uninstall(id);
        this.updatePlugin(id, { installed: false });
      } catch (e) {
        log.error(e);
        this.updatePlugin(id, { error: e });
        this.$noty.error(`Failed to uninstall plugin: ${e.message}`);
      }
    },
    async getAutoUpdateSetting(id: string) {
      this.autoUpdateEnabled = await this.$util.send(
        "plugin/getPluginSetting",
        { id, key: 'autoUpdate' }
      );
    },
    async toggleAutoUpdate(event) {
      const enabled = event.target.checked;
      await this.$util.send("plugin/setPluginSetting", {
        id: this.selectedPlugin.id,
        key: 'autoUpdate',
        value: enabled,
      });
      this.autoUpdateEnabled = enabled;
    },
    async getReadOnlySetting(id: string) {
      this.pluginReadOnly = await this.$util.send(
        "plugin/getPluginSetting",
        { id, key: 'readOnly' }
      )
    },
    async toggleReadOnly(event) {
      const value = event.target.checked;
      await this.$util.send("plugin/setPluginSetting", {
        id: this.selectedPlugin.id,
        key: 'readOnly',
        value
      });
      this.pluginReadOnly = value;
    },
    async openPluginPage({ id }) {
      this.selectedPluginIdx = this.plugins.findIndex((p) => p.id === id);
      this.selectedPluginRepo = null;
      this.loadingPluginReadme = true;
      this.activePageId = "plugin-detail";
      await this.getAutoUpdateSetting(id);
      await this.getReadOnlySetting(id);
      try {
        this.selectedPluginRepo = await this.$util.send("plugin/repository", { id });
      } catch (e) {
        log.error(e);

        if (e instanceof PluginSystemError && e.code === "PLUGIN_NOT_FOUND") {
          try {
            const readme = await this.$util.send("plugin/getAsset", { manifest: this.selectedPlugin, path: 'README.md' });
            this.selectedPluginRepo = {
              readme
            };
            this.loadingPluginReadme = false;
            return;
          } catch { }

          // FIXME use error alert box
          this.$noty.error("We can't find the repository for this plugin.");
        } else {
          this.$noty.error(`Error opening plugin page: ${e.message}`);
        }
      }
      this.loadingPluginReadme = false;
    },
    async buildPluginListData() {
      const entries: ExtensionRegistryEntry[] = this.entries;
      const installedPlugins: PluginSnapshot[] = this.snapshots;
      const list: ExtensionUI[] = [];

      for (const { manifest, loadable, origin } of installedPlugins) {
        const data: ExtensionUI = {
          ...manifest,
          installed: true,
          installing: false,
          checkingForUpdates: null,
          loadable,
          origin
        } as ExtensionUI;

        if (data.origin === 'bundled') {
          continue;
        }

        const entry = entries.find((entry) => entry.id === manifest.id);

        // if the plugin is found in a registry
        if (entry) {
          data.repo = entry.repo;
          data.updateAvailable = await this.$util
            .send("plugin/checkForUpdates", { id: manifest.id })
            .catch((e) => {
              this.errors = [
                `Failed to check for updates for ${manifest.id}: ${e.message}`,
              ];
              console.error(e);
              return false;
            });
        }

        list.push(data);
      }

      for (const entry of entries) {
        if (!_.find(list, { id: entry.id })) {
          const data: ExtensionUI = {
            ...entry,
            installed: false,
            installing: false,
            checkingForUpdates: null,
          } as ExtensionUI;

          list.push(data);
        }
      }

      return list;
    },
    pluginSorter(p: ExtensionUI) {
      return ORIGIN_ORDER[p.origin] + INSTALL_ORDER[`${p.installed}`] + DISABLED_ORDER[`${p.disabled}`];
    },
    async saveGithubToken(value: string) {
      await this.$settings.set('pluginGithubToken', value);
    }
  },
});
</script>

<style lang="scss" scoped>
@import '../../../assets/styles/app/_variables';
.config ::v-deep {
  .content > :first-child {
    margin-top: 0;
  }

  h3 {
    margin-top: 1rem;
    margin-bottom: 0.75rem;
    padding-inline: 0.5rem;
    font-size: 1rem;
  }

  p.description {
    margin-bottom: 0.25rem;
    padding-inline: 0.5rem;
    font-size: $base-font-size;
  }

  hr {
    margin-inline: 0.5rem;
  }

  .form-group {
    padding: 0.5rem;
    border-radius: 6px;
  }
}

.mode-options {
  display: flex;
  align-items: center;
  width: fit-content;
}

.mode-option {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 0.25rem;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.15rem;
  color: var(--btn-fg);
  background: var(--btn-flat-bg);
  cursor: pointer;
  transition: background 0.15s ease-in-out, color 0.15s ease-in-out;

  &:hover {
    color: var(--btn-flat-fg-hover);
  }

  &:first-child {
    border-start-start-radius: 8px;
    border-end-start-radius: 8px;
  }

  &:last-child {
    border-start-end-radius: 8px;
    border-end-end-radius: 8px;
  }

  input {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
    box-shadow: none;
  }


  .mode-option-content {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.0325rem 0.75rem;
    border-radius: 8px;
  }

  input:checked + .mode-option-content {
    color: var(--text-contrast);
    background: var(--bg-active-a);
  }

  input:focus-visible + .mode-option-content {
    outline: var(--focus-ring);
  }
}

.theme-list {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: calc((100% - 4rem) / 4.5);
  gap: 0.5rem;
  overflow-x: auto;
  // Just enough padding-top so the menu button doesn't get clipped by overflow
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  padding-right: 0.2rem;
  margin-top: -0.3rem;
}

.form-group label.theme-item {
  display: flex;
  flex-direction: column;
  padding: 0;
  cursor: pointer;
  align-items: flex-start;

  .theme-preview-frame {
    overflow: hidden;
    border-radius: 4px;
    border: 1px solid var(--border-subtle);
    border-radius: 4px;
  }

  &.selected .theme-preview-frame {
    border-color: var(--border-hover);
    outline: 1px solid var(--border-hover);
    box-shadow: 0 0 3px 1px var(--border-hover);
  }

  &:has(input:focus-visible) .theme-preview-frame {
    outline: var(--focus-ring);
  }

  .theme-name {
    display: flex;
    align-items: center;
    width: 100%;
    height: 1.15rem;
    margin-bottom: 0.35rem;
    font-size: 12px;
    font-weight: 700;

    .theme-label {
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    input {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
      border: 0;
      box-shadow: none;
    }
  }
}

.theme-preview-frame {
  width: 100%;
}

.form-group label.theme-item.disabled {
  cursor: default;

  .theme-label {
    opacity: 0.6;
  }
}

.theme-disabled-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.25rem;
  aspect-ratio: 16 / 10;
  padding: 0.35rem;
  font-size: 11px;
  overflow: hidden;
}

$gutter-h: 1.5rem;

.alerts {
  margin-inline: 1.25rem;
}

.plugin-manager-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

.plugin-manager-filter-container {
  margin-top: 1rem;
}

</style>

<template>
  <div class="config-page-content">
    <control-row
      fieldset
      title="Theme mode"
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
    </control-row>
    <control-row
      fieldset
      direction="column"
      title="Available Themes"
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
                  <x-menuitem @click="openThemePage(theme.manifest)">
                    <x-label>View</x-label>
                  </x-menuitem>
                  <x-menuitem @click="uninstall(theme.manifest)">
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
    </control-row>
    <control-row
      title="Get More Themes"
      description="Themes made and shared by the community."
    >
      <button
        type="button"
        class="btn btn-flat"
        @click="config.open('community-themes')"
      >
        Browse…
      </button>
    </control-row>
    <control-row
      title="Theme Configuration"
      description="Updates, community and unlisted themes."
    >
      <button
        type="button"
        class="btn btn-flat"
        @click="config.open('theme-config')"
      >
        Configure…
      </button>
    </control-row>
    <config-page
      id="community-themes"
      title="Themes"
      :loading="loadingEntries || loadingThemes"
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
            @click="reinitThemeData"
          >
            Retry
          </button>
        </div>
        <div class="alerts">
          <error-alert :error="errors" />
        </div>
        <plugin-list
          v-if="!themeEntriesError || sortedThemes.length > 0"
          :plugins="sortedThemes"
          search-placeholder="Search Themes"
          :show-origin-filter="false"
          @install="install"
          @uninstall="uninstall"
          @update="update"
          @item-click="openThemePage"
          @checkForUpdates="checkForUpdates"
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
          type="theme"
          :extension="selectedTheme"
          :extension-repo="selectedThemeRepo"
          :loading-markdown="loadingThemeReadme"
          @install="install(selectedTheme)"
          @uninstall="uninstall(selectedTheme)"
          @update="update(selectedTheme)"
          @checkForUpdates="checkForUpdates(selectedTheme)"
        />
      </template>
    </config-page>
    <config-page
      id="theme-config"
      title="Theme Configuration"
    >
      <control-row
        title="Auto update"
        description="Allow themes to be automatically updated on application launch."
      >
        <x-switch
          @click.prevent="themeAutoUpdate = !themeAutoUpdate"
          :toggled="themeAutoUpdate"
        />
      </control-row>
      <control-row
        title="Community Themes"
        description="Community themes are developed and maintained by independent third parties, not by Beekeeper Studio. Use at your own risk."
      >
        <x-switch
          @click.prevent="communityThemesEnabled = !communityThemesEnabled"
          :toggled="communityThemesEnabled"
        />
      </control-row>
      <control-row
        title="Unlisted Themes"
        description="Enable unlisted themes. These are themes not found in a registry, just placed in your themes directory manually."
      >
        <x-switch
          @click.prevent="unlistedThemesEnabled = !unlistedThemesEnabled"
          :toggled="unlistedThemesEnabled"
        />
      </control-row>
    </config-page>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { mapActions, mapGetters, mapState } from "vuex";
import ThemePreview from "@/components/common/ThemePreview.vue";
import ConfigPage from "@/components/common/config/ConfigPage.vue";
import ControlRow from "@/components/common/ControlRow.vue";
import ErrorAlert from "@/components/common/ErrorAlert.vue";
import ExtensionPage from "@/components/plugins/ExtensionPage.vue";
import PluginList from "@/components/plugins/PluginList.vue";
import type {
  ExtensionOrigin,
  ExtensionRegistryEntry,
  ExtensionUI,
  ThemeSnapshot,
} from "@/services/plugin/types";
import rawLog from "@bksLogger";
import _ from "lodash";

const log = rawLog.scope("ThemesConfig");

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
  name: "ThemesConfig",
  components: {
    ThemePreview,
    ConfigPage,
    ControlRow,
    ErrorAlert,
    ExtensionPage,
    PluginList,
  },
  inject: ["config"],
  data() {
    return {
      themes: [] as ExtensionUI[],
      selectedThemeIdx: -1,
      selectedThemeRepo: null,
      loadingThemeReadme: false,
      errors: null,
      loadingThemes: false,
    };
  },
  computed: {
    ...mapState("themes/snapshots", {
      snapshots: "all",
    }),
    ...mapState("themes/entries", {
      themeEntriesError: "error",
      loadingEntries: "loading",
    }),
    ...mapGetters("themes/entries", {
      entries: "all",
    }),
    ...mapGetters("themes/snapshots", ["snapshotsById"]),
    ...mapGetters({
      themeId: "themes/id",
      themeAppearance: "themes/appearance",
    }),
    selectedTheme() {
      return this.themes[this.selectedThemeIdx];
    },
    sortedThemes() {
      return _.sortBy(this.displayThemes, this.themeSorter);
    },
    displayThemes(): ExtensionUI[] {
      return this.themes.map((theme) => ({
        ...theme,
        disabled: this.snapshotsById[theme.id]?.disableState.disabled
      }));
    },
    listedThemes(): ThemeSnapshot[] {
      return this.snapshots.filter((theme) => !theme.disableState.disabled);
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
        await this.reinitThemeData();
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
        await this.reinitThemeData();
      },
    },
  },
  async mounted() {
    await this.reinitThemeData();
  },
  methods: {
    ...mapActions("themes", {
      setThemeDark: "setDark",
      setThemeId: "setId",
    }),
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
    async reinitThemeData() {
      this.themes = [];
      await this.$store.dispatch("themes/initialize");
      await this.loadThemes();
    },
    async loadThemes() {
      this.loadingThemes = true;

      try {
        this.themes = await this.buildThemeListData();
      } catch (e) {
        log.error(e);
      }

      this.loadingThemes = false;
    },
    updateTheme(id: string, updated: Partial<ExtensionUI>) {
      const idx = this.themes.findIndex((t) => t.id === id);
      if (idx === -1) {
        return;
      }
      this.$set(this.themes, idx, { ...this.themes[idx], ...updated });
    },
    async install({ id }) {
      try {
        this.updateTheme(id, { installing: true, error: null });
        await this.$util.send("theme/install", { id });
        await this.$store.dispatch("themes/snapshots/load");
        this.updateTheme(id, { installed: true, loadable: true });
      } catch (e) {
        log.error(e);
        this.updateTheme(id, { error: e });
        this.$noty.error(`Failed to install theme: ${e.message}`);
      } finally {
        this.updateTheme(id, { installing: false });
      }
    },
    async update({ id }) {
      try {
        this.updateTheme(id, { installing: true, error: null });
        const manifest = await this.$util.send("theme/update", { id });
        await this.$store.dispatch("themes/snapshots/load");
        this.updateTheme(id, {
          version: manifest.version,
          updateAvailable: false,
          loadable: true,
        });
      } catch (e) {
        log.error(e);
        this.updateTheme(id, { error: e });
        this.$noty.error(`Failed to update theme: ${e.message}`);
      } finally {
        this.updateTheme(id, { installing: false });
      }
    },
    async checkForUpdates({ id }) {
      try {
        this.updateTheme(id, { checkingForUpdates: true });
        this.updateTheme(id, {
          updateAvailable: await this.$util.send("theme/checkForUpdates", {
            id,
          }),
        });
      } catch (e) {
        log.error(e);
        this.$noty.error(`Failed to check for update: ${e.message}`);
      } finally {
        this.updateTheme(id, { checkingForUpdates: false });
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
        await this.$util.send("theme/uninstall", { id });
        if (this.themeId === id) {
          await this.setThemeId("default");
        }
        await this.$store.dispatch("themes/snapshots/load");
        this.updateTheme(id, { installed: false });
      } catch (e) {
        log.error(e);
        this.updateTheme(id, { error: e });
        this.$noty.error(`Failed to uninstall theme: ${e.message}`);
      }
    },
    async openThemePage({ id }) {
      this.selectedThemeIdx = this.themes.findIndex((t) => t.id === id);
      this.selectedThemeRepo = null;
      this.loadingThemeReadme = true;
      this.config.open("theme-detail");
      try {
        this.selectedThemeRepo = await this.$util.send("theme/details", { id });
      } catch (e) {
        log.error(e);
        this.$noty.error(`Error opening theme page: ${e.message}`);
      }
      this.loadingThemeReadme = false;
    },
    async buildThemeListData() {
      const entries: ExtensionRegistryEntry[] = this.entries;
      const installedThemes: ThemeSnapshot[] = this.snapshots;
      const list: ExtensionUI[] = [];

      for (const { manifest, origin } of installedThemes) {
        const data: ExtensionUI = {
          ...manifest,
          installed: true,
          installing: false,
          checkingForUpdates: null,
          loadable: true,
          origin
        } as ExtensionUI;

        if (data.origin === "bundled") {
          continue;
        }

        const entry = entries.find((entry) => entry.id === manifest.id);

        // if the theme is found in a registry
        if (entry) {
          data.repo = entry.repo;
          data.updateAvailable = await this.$util
            .send("theme/checkForUpdates", { id: manifest.id })
            .catch((e) => {
              this.errors = [
                `Failed to check for updates for ${manifest.id}: ${e.message}`,
              ];
              log.error(e);
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
    themeSorter(t: ExtensionUI) {
      return ORIGIN_ORDER[t.origin] + INSTALL_ORDER[`${t.installed}`] + DISABLED_ORDER[`${t.disabled}`];
    },
  },
});
</script>

<style lang="scss" scoped>
.alerts {
  margin-inline: 1.25rem;
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
</style>

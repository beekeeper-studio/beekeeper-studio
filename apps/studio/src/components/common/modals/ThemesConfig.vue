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
import { mapActions, mapGetters } from "vuex";
import ThemePreview from "@/components/common/ThemePreview.vue";
import ConfigPage from "@/components/common/config/ConfigPage.vue";
import ControlRow from "@/components/common/ControlRow.vue";
import ExtensionPage from "@/components/plugins/ExtensionPage.vue";
import PluginList from "@/components/plugins/PluginList.vue";
import type {
  ExtensionRegistryEntry,
  ExtensionUI,
  ThemeSnapshot,
} from "@/services/plugin/types";
import rawLog from "@bksLogger";

const log = rawLog.scope("ThemesConfig");

export default Vue.extend({
  name: "ThemesConfig",
  components: {
    ThemePreview,
    ConfigPage,
    ExtensionPage,
    PluginList,
    ControlRow,
  },
  inject: ["config"],
  data() {
    return {
      selectedTheme: null as ExtensionUI | null,
      selectedThemeRepo: null,
      loadingThemeReadme: false,
      themeEntries: [] as ExtensionRegistryEntry[],
      themeEntriesError: null as string | null,
      loadingEntries: false,
      installingIds: [] as string[],
      installErrors: {} as Record<string, string>,
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
  },
  mounted() {
    this.loadThemeEntries();
  },
  methods: {
    ...mapActions("theme", {
      setThemeDark: "setDark",
      setThemeId: "setId",
      loadThemes: "loadThemes",
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
      this.config.open("theme-detail");
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
        this.config.open("themes");
        if (this.themeId === id) {
          await this.setThemeId("default");
        }
        await this.loadThemes();
      } catch (e) {
        this.$noty.error(`Failed to uninstall theme: ${e.message}`);
      }
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
      this.config.open("theme-detail");
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
  },
});
</script>

<style lang="scss" scoped>
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

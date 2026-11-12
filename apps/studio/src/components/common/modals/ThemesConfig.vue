<template>
  <div class="config-page-content">
    <control-row
      title="Community Themes"
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
    <control-row fieldset title="Theme mode">
      <span class="mode-options">
        <label class="mode-option">
          <input
            type="radio"
            name="theme-mode"
            class="visually-hidden"
            value="light"
            :checked="themeAppearance === 'light'"
            @change="setThemeDark('light')"
          />
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
          />
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
          />
          <span class="mode-option-content">Auto</span>
        </label>
      </span>
    </control-row>
    <control-row fieldset direction="column" title="Installed Themes">
      <div class="theme-list">
        <theme-preview
          v-for="theme in enabledThemes"
          :key="theme.manifest.id"
          :theme="theme"
          @change="setThemeId"
          @view="openPage"
          @uninstall="uninstall"
        />
      </div>
      <!-- Show the upsell buttons even if there are no license disabled themes -->
      <template v-if="isCommunity">
        <div class="license-notice">
          <span>Upgrade to unlock Community themes</span>
          <upsell-buttons />
        </div>
        <div class="theme-list">
          <theme-preview
            v-for="theme in licenseDisabledThemes"
            :key="theme.manifest.id"
            :theme="theme"
            @change="setThemeId"
            @view="openPage"
            @uninstall="uninstall"
          />
        </div>
      </template>
    </control-row>
    <config-page
      id="community-themes"
      title="Community Themes"
      :loading="loadingEntries || loadingCatalog"
    >
      <div
        v-if="entriesError"
        class="alert alert-danger"
      >
        <i class="material-icons">error_outline</i>
        <div class="alert-body expand">
          Community themes unavailable: {{ entriesError }}
        </div>
        <button
          type="button"
          class="btn btn-flat"
          @click="reload"
        >
          Retry
        </button>
      </div>
      <error-alert :error="errors" />
      <plugin-list
        v-if="!entriesError || sortedCatalog.length > 0"
        :plugins="sortedCatalog"
        search-placeholder="Search Themes"
        type="theme"
        @install="install"
        @uninstall="uninstall"
        @update="update"
        @item-click="openPage"
        @checkForUpdates="checkForUpdates"
      >
        <template #sticky-header>
          <h3>Browse Themes</h3>
          <button
            v-if="hasInstalledItems"
            type="button"
            class="btn btn-icon"
            title="Check For Updates"
            @click="checkAllForUpdates"
          >
            <i class="material-icons">refresh</i>
          </button>
        </template>
      </plugin-list>
    </config-page>
    <config-page
      id="theme-detail"
      :title="selectedItem ? selectedItem.name : ''"
      :loading="loadingReadme"
    >
      <template>
        <extension-page
          v-if="selectedItem"
          type="theme"
          :extension="selectedItem"
          :extension-repo="selectedRepo"
          :loading-markdown="loadingReadme"
          @install="install(selectedItem)"
          @uninstall="uninstall(selectedItem)"
          @update="update(selectedItem)"
          @checkForUpdates="checkForUpdates(selectedItem)"
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
          @click.prevent="autoUpdate = !autoUpdate"
          :toggled="autoUpdate"
        />
      </control-row>
      <control-row
        title="Community Themes"
        description="Community themes are developed and maintained by independent third parties, not by Beekeeper Studio. Use at your own risk."
      >
        <x-switch
          @click.prevent="communityEnabled = !communityEnabled"
          :toggled="communityEnabled"
        />
      </control-row>
      <control-row
        title="Unlisted Themes"
        description="Enable unlisted themes. These are themes not found in a registry, just placed in your themes directory manually."
      >
        <x-switch
          @click.prevent="unlistedEnabled = !unlistedEnabled"
          :toggled="unlistedEnabled"
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
import UpsellButtons from "@/components/upsell/common/UpsellButtons.vue";
import type {
  ExtensionOrigin,
  ExtensionRegistryEntry,
  ExtensionUI,
  ThemeSnapshot,
} from "@/services/plugin/types";
import { AppEvent } from "@/common/AppEvent";
import { ThemeSystemError } from "@/lib/errors";
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

export default Vue.extend({
  name: "ThemesConfig",
  components: {
    ThemePreview,
    ConfigPage,
    ControlRow,
    ErrorAlert,
    ExtensionPage,
    PluginList,
    UpsellButtons,
  },
  inject: ["config"],
  data() {
    return {
      catalog: [] as ExtensionUI[],
      selectedItemIdx: -1,
      selectedRepo: null,
      loadingReadme: false,
      errors: null,
      loadingCatalog: false,
    };
  },
  computed: {
    ...mapGetters(["isCommunity"]),
    ...mapState("themes/snapshots", {
      installedThemes: "all",
    }),
    ...mapState("themes/entries", {
      entriesError: "error",
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
    selectedItem() {
      return this.catalog[this.selectedItemIdx];
    },
    sortedCatalog() {
      const items: ExtensionUI[] = this.catalog.map((item) => ({
        ...item,
        disabled: this.snapshotsById[item.id]?.disableState.disabled,
      }));
      return _.sortBy(items, this.sorter);
    },
    hasInstalledItems(): boolean {
      return this.catalog.some((item) => item.installed);
    },
    autoUpdate: {
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
    communityEnabled: {
      get() {
        return !this.$bksConfig.themeSystem.communityDisabled;
      },
      async set(value) {
        await this.$util.send("config/writeUserValue", {
          path: "themeSystem.communityDisabled",
          value: !value,
        });
        await this.reload();
      },
    },
    unlistedEnabled: {
      get() {
        return !this.$bksConfig.themeSystem.unlistedDisabled;
      },
      async set(value) {
        await this.$util.send("config/writeUserValue", {
          path: "themeSystem.unlistedDisabled",
          value: !value,
        });
        await this.reload();
      },
    },
      enabledThemes(): ThemeSnapshot[] {
      return this.installedThemes.filter(
        (theme) => !theme.disableState.disabled,
      );
    },
    licenseDisabledThemes(): ThemeSnapshot[] {
      return this.installedThemes.filter(
        (theme) =>
          theme.disableState.disabled &&
          theme.disableState.reason === "license-required",
      );
    },
  },
  async mounted() {
    await this.reload();
  },
  methods: {
    ...mapActions("themes", {
      setThemeDark: "setDark",
      setThemeId: "setId",
    }),
    async reload() {
      this.catalog = [];
      await this.$store.dispatch("themes/initialize");
      await this.loadCatalog();
    },
    async loadCatalog() {
      this.loadingCatalog = true;

      try {
        this.catalog = await this.buildCatalog();
      } catch (e) {
        log.error(e);
      }

      this.loadingCatalog = false;
    },
    patchCatalogItem(id: string, patch: Partial<ExtensionUI>) {
      const idx = this.catalog.findIndex((item) => item.id === id);
      if (idx === -1) {
        return;
      }
      this.$set(this.catalog, idx, { ...this.catalog[idx], ...patch });
    },
    async install({ id }) {
      try {
        this.patchCatalogItem(id, { installing: true, error: null });
        await this.$util.send("theme/install", { id });
        await this.$store.dispatch("themes/snapshots/load");
        this.patchCatalogItem(id, { installed: true, loadable: true });
        if (!this.snapshotsById[id]?.disableState.disabled) {
          await this.setThemeId(id);
        }
      } catch (e) {
        log.error(e);
        if (
          e instanceof ThemeSystemError &&
          e.code === "LICENSE_REQUIRED"
        ) {
          this.$root.$emit(AppEvent.upgradeModal, "Community Themes");
          return;
        }
        this.patchCatalogItem(id, { error: e });
        this.$noty.error(`Failed to install theme: ${e.message}`);
      } finally {
        this.patchCatalogItem(id, { installing: false });
      }
    },
    async update({ id }) {
      try {
        this.patchCatalogItem(id, { installing: true, error: null });
        const manifest = await this.$util.send("theme/update", { id });
        await this.$store.dispatch("themes/snapshots/load");
        this.patchCatalogItem(id, {
          version: manifest.version,
          updateAvailable: false,
          loadable: true,
        });
      } catch (e) {
        log.error(e);
        this.patchCatalogItem(id, { error: e });
        this.$noty.error(`Failed to update theme: ${e.message}`);
      } finally {
        this.patchCatalogItem(id, { installing: false });
      }
    },
    async checkForUpdates({ id }) {
      try {
        this.patchCatalogItem(id, { checkingForUpdates: true });
        this.patchCatalogItem(id, {
          updateAvailable: await this.$util.send("theme/checkForUpdates", {
            id,
          }),
        });
      } catch (e) {
        log.error(e);
        this.$noty.error(`Failed to check for update: ${e.message}`);
      } finally {
        this.patchCatalogItem(id, { checkingForUpdates: false });
      }
    },
    async checkAllForUpdates() {
      const installed = this.catalog.filter((item) => item.installed && item.repo);
      await Promise.all(installed.map((item) => this.checkForUpdates(item)));
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
        this.patchCatalogItem(id, { installed: false });
      } catch (e) {
        log.error(e);
        this.patchCatalogItem(id, { error: e });
        this.$noty.error(`Failed to uninstall theme: ${e.message}`);
      }
    },
    async openPage({ id }) {
      this.selectedItemIdx = this.catalog.findIndex((item) => item.id === id);
      this.selectedRepo = null;
      this.loadingReadme = true;
      this.config.open("theme-detail");
      try {
        this.selectedRepo = await this.$util.send("theme/repository", { id });
      } catch (e) {
        log.error(e);
        this.$noty.error(`Error opening theme page: ${e.message}`);
      }
      this.loadingReadme = false;
    },
    async buildCatalog() {
      const entries: ExtensionRegistryEntry[] = this.entries;
      const installedThemes: ThemeSnapshot[] = this.installedThemes;
      const catalog: ExtensionUI[] = [];

      for (const { manifest, origin } of installedThemes) {
        if (origin === "bundled") {
          continue;
        }

        const item: ExtensionUI = {
          ...manifest,
          installed: true,
          installing: false,
          checkingForUpdates: null,
          loadable: true,
          origin
        } as ExtensionUI;

        const entry = entries.find((entry) => entry.id === manifest.id);

        if (entry) {
          item.repo = entry.repo;
          item.updateAvailable = await this.$util
            .send("theme/checkForUpdates", { id: manifest.id })
            .catch((e) => {
              this.errors = [
                `Failed to check for updates for ${manifest.id}: ${e.message}`,
              ];
              log.error(e);
              return false;
            });
        }

        catalog.push(item);
      }

      for (const entry of entries) {
        if (!_.find(catalog, { id: entry.id })) {
          catalog.push({
            ...entry,
            installed: false,
            installing: false,
            checkingForUpdates: null,
          } as ExtensionUI);
        }
      }

      return catalog;
    },
    sorter(item: ExtensionUI) {
      return (
        ORIGIN_ORDER[item.origin] + (item.installed ? 0 : 10) + (item.disabled ? 20 : 0)
      );
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
  transition:
    background 0.15s ease-in-out,
    color 0.15s ease-in-out;

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
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
  padding-top: 1rem;
}

.license-notice {
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-subtle);
  color: var(--text-muted);
}
</style>

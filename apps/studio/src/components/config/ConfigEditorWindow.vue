<template>
  <div class="style-wrapper">
    <div class="beekeeper-studio-wrapper config-editor-window">
      <div class="titlebar-wrapper">
        <div
          class="titlebar"
          :class="{ windows: !$config.isMac }"
          @dblclick.prevent.stop="maximizeWindow"
        >
          <div class="titlebar-title noselect">
            <span>Config</span>
          </div>
          <div class="titlebar-actions">
            <div
              v-if="!$config.isMac"
              class="window-controls-container"
            >
              <button
                class="btn btn-link"
                id="minimize"
                @click.prevent="minimizeWindow"
              >
                <i class="material-icons">remove</i>
              </button>
              <button
                class="btn btn-link"
                id="maximize"
                @click.prevent="maximizeWindow"
              >
                <i
                  class="material-icons maximized"
                  v-if="maximized"
                >filter_none</i>
                <i
                  class="material-icons"
                  v-else
                >crop_square</i>
              </button>
              <button
                class="btn btn-link"
                id="quit"
                @click.prevent="closeWindow"
              >
                <i class="material-icons">clear</i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="config-editor" v-if="loaded">
        <div class="config-toolbar">
          <div class="config-toolbar-left">
            <button
              class="btn btn-flat btn-small"
              :disabled="!selectedReferenceText"
              @click.prevent="copySelectionToUserConfig"
              title="Append the selected lines to your config"
            >
              <i class="material-icons">arrow_forward</i>
              Copy to my config
            </button>
          </div>
          <div class="config-toolbar-right">
            <span
              class="config-hint config-admin-note"
              v-if="systemPath"
              :title="systemPath"
            >
              <i class="material-icons">admin_panel_settings</i>
              Admin config in effect
            </span>
            <span class="config-hint">{{ searchHint }}</span>
            <button
              class="btn btn-primary btn-small"
              :disabled="!dirty || saving"
              @click.prevent="save"
            >
              {{ saving ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </div>

        <div
          class="config-banner"
          v-if="savedNeedsRestart"
        >
          <i class="material-icons">info</i>
          <span>Saved. Restart to apply changes.</span>
          <span class="config-banner-actions">
            <button class="btn btn-flat btn-small" @click.prevent="restart">Restart</button>
            <button class="btn btn-flat btn-small" @click.prevent="savedNeedsRestart = false">Later</button>
          </span>
        </div>

        <div class="config-panes">
          <div class="config-pane">
            <div class="config-pane-header">
              <span class="config-pane-title">Default</span>
              <span class="config-pane-subtitle">Read only</span>
            </div>
            <div class="config-pane-body">
              <text-editor
                language-id="ini"
                read-only
                :value="defaultText"
                :line-numbers="true"
                @bks-selection-change="selectedReferenceText = $event.value"
              />
            </div>
          </div>

          <div class="config-pane">
            <div class="config-pane-header">
              <span class="config-pane-title">
                Your config<span v-if="dirty" class="config-dirty-dot" title="Unsaved changes">•</span>
              </span>
              <span class="config-pane-subtitle" :title="userPath">{{ userPath }}</span>
            </div>
            <div class="config-pane-body">
              <text-editor
                language-id="ini"
                :value="userText"
                :markers="markers"
                :line-numbers="true"
                @bks-value-change="onUserTextChange($event.value)"
              />
            </div>
          </div>
        </div>

        <div class="config-problems" v-if="problems.length">
          <div
            v-for="(problem, idx) in problems"
            :key="idx"
            class="config-problem"
            :class="problem.severity"
          >
            <i class="material-icons">{{ problem.severity === 'error' ? 'error' : 'warning' }}</i>
            <span class="config-problem-line">Line {{ problem.line + 1 }}</span>
            <span class="config-problem-message">{{ problem.message }}</span>
          </div>
        </div>
        <div class="config-problems empty" v-else>
          <i class="material-icons">check_circle</i>
          <span>No problems found.</span>
        </div>
      </div>

      <div class="config-editor-loading" v-else>
        <span>Loading config…</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import _ from "lodash";
import TextEditor from "@beekeeperstudio/ui-kit/vue/text-editor";
import { parseIni, processRawConfig } from "@/config/helpers";
import {
  checkUnrecognized,
  checkConflicts,
  checkDeprecations,
} from "@/common/bksConfig/configValidation";
import { lintUserConfig } from "@/common/bksConfig/iniLint";
import type { LocatedProblem } from "@/common/bksConfig/iniLint";
import type { ConfigEntryDetailWarning } from "@/common/bksConfig/BksConfigProvider";
import type { EditorMarker } from "@/lib/editor/utils";
import rawLog from "@bksLogger";

const log = rawLog.scope("ConfigEditorWindow");

export default Vue.extend({
  components: { TextEditor },
  data() {
    return {
      loaded: false,
      saving: false,
      savedNeedsRestart: false,
      maximized: false,
      defaultText: "",
      userText: "",
      savedText: "",
      userPath: "",
      systemPath: null as string | null,
      selectedReferenceText: "",
      problems: [] as LocatedProblem[],
      debouncedValidate: null as null | (() => void) & { cancel: () => void },
    };
  },
  computed: {
    searchHint(): string {
      return this.$config.isMac ? "Cmd+F to search" : "Ctrl+F to search";
    },
    dirty(): boolean {
      return this.userText !== this.savedText;
    },
    markers(): EditorMarker[] {
      return this.problems.map((problem) => ({
        type: problem.severity,
        message: problem.message,
        from: { line: problem.line, ch: problem.from },
        to: { line: problem.line, ch: problem.to },
      }));
    },
  },
  methods: {
    /**
     * Run the same checks the app runs at startup, but against the text
     * currently in the editor rather than against what is on disk.
     */
    validate() {
      const source = window.bksConfigSource;
      let parsed: Record<string, unknown> = {};
      let warnings: ConfigEntryDetailWarning[] = [];

      try {
        parsed = processRawConfig(parseIni(this.userText));
      } catch (e) {
        // parseIni is lenient, so this is unusual — the line-level checks in
        // lintUserConfig do the real work of describing broken syntax.
        log.warn("Failed parsing config text", e);
      }

      const deprecated = source.deprecatedConfig || {};

      try {
        warnings = [
          ...checkUnrecognized(source.defaultConfig, parsed, deprecated, "user"),
          ...checkDeprecations(parsed, deprecated, "user"),
          ...checkConflicts(parsed, source.systemConfig, "user"),
        ];
      } catch (e) {
        log.error("Failed validating config text", e);
      }

      this.problems = lintUserConfig(this.userText, warnings);
    },
    onUserTextChange(value: string) {
      this.userText = value;
      this.debouncedValidate?.();
    },
    copySelectionToUserConfig() {
      const selection = this.selectedReferenceText.trim();
      if (!selection) return;
      const separator = this.userText.endsWith("\n") || this.userText === "" ? "" : "\n";
      this.userText = `${this.userText}${separator}${selection}\n`;
      this.validate();
    },
    async save() {
      this.saving = true;
      try {
        await window.main.config.write(this.userText);
        this.savedText = this.userText;
        this.savedNeedsRestart = true;
      } catch (e) {
        log.error("Failed saving config", e);
        this.$noty.error(`Failed saving config: ${e.message}`);
      } finally {
        this.saving = false;
      }
    },
    async restart() {
      await window.main.config.restart();
    },
    minimizeWindow() {
      window.main.minimizeWindow();
    },
    async maximizeWindow() {
      if (this.maximized) {
        await window.main.unmaximizeWindow();
      } else {
        await window.main.maximizeWindow();
      }
      this.maximized = !this.maximized;
    },
    closeWindow() {
      window.main.closeWindow();
    },
    onBeforeUnload(event: BeforeUnloadEvent) {
      if (!this.dirty) return;
      event.preventDefault();
      event.returnValue = "";
    },
  },
  async mounted() {
    this.debouncedValidate = _.debounce(this.validate, 250);

    try {
      const contents = await window.main.config.read();
      this.defaultText = contents.defaultText;
      this.userText = contents.userText;
      this.savedText = contents.userText;
      this.userPath = contents.userPath;
      this.systemPath = contents.systemPath;
      this.loaded = true;
      this.validate();
    } catch (e) {
      log.error("Failed loading config files", e);
      this.$noty.error(`Failed loading config: ${e.message}`);
    }

    window.addEventListener("beforeunload", this.onBeforeUnload);
  },
  beforeDestroy() {
    window.removeEventListener("beforeunload", this.onBeforeUnload);
    this.debouncedValidate?.cancel();
  },
});
</script>

<style lang="scss" scoped>
@import '../../assets/styles/app/_variables';

.config-editor-window {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.config-editor,
.config-editor-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.config-editor-loading {
  align-items: center;
  justify-content: center;
  color: var(--bks-text-lighter);
}

.config-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $gutter-h * 0.5 $gutter-w * 0.5;
  border-bottom: 1px solid var(--bks-border-color);
  gap: $gutter-w * 0.5;

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .material-icons {
    font-size: 16px;
  }
}

.config-hint {
  color: var(--bks-text-lighter);
  font-size: 12px;
  margin-right: $gutter-w * 0.5;
}

.config-toolbar-right {
  display: flex;
  align-items: center;
}

.config-admin-note {
  display: inline-flex;
  align-items: center;
  gap: 4px;

  .material-icons {
    font-size: 14px;
  }
}

.config-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: $gutter-h * 0.5 $gutter-w * 0.5;
  background: var(--bks-row-highlight);
  border-bottom: 1px solid var(--bks-border-color);

  .material-icons {
    font-size: 18px;
    color: var(--bks-brand-info);
  }

  .config-banner-actions {
    margin-left: auto;
    display: flex;
    gap: 4px;
  }
}

.config-panes {
  flex: 1;
  display: flex;
  min-height: 0;
}

.config-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;

  & + .config-pane {
    border-left: 1px solid var(--bks-border-color);
  }
}

.config-pane-header {
  display: flex;
  align-items: center;
  gap: $gutter-w * 0.5;
  padding: 4px $gutter-w * 0.5;
  border-bottom: 1px solid var(--bks-border-color);
  font-size: 12px;
}

.config-pane-tabs .btn.active {
  color: var(--bks-text-dark);
  font-weight: bold;
}

.config-pane-title {
  font-weight: bold;
}

.config-pane-subtitle {
  color: var(--bks-text-lighter);
  margin-left: auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.config-dirty-dot {
  color: var(--bks-brand-warning);
  margin-left: 4px;
}

.config-pane-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.config-problems {
  max-height: 25vh;
  overflow-y: auto;
  border-top: 1px solid var(--bks-border-color);
  padding: 4px 0;
  font-size: 12px;

  &.empty {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px $gutter-w * 0.5;
    color: var(--bks-text-lighter);
  }
}

.config-problem {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 3px $gutter-w * 0.5;

  .material-icons {
    font-size: 14px;
  }

  &.error .material-icons {
    color: var(--bks-brand-danger);
  }

  &.warning .material-icons {
    color: var(--bks-brand-warning);
  }
}

.config-problem-line {
  color: var(--bks-text-lighter);
  flex-shrink: 0;
}
</style>

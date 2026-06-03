<template>
  <div class="form-group cli-path-picker">
    <label :for="inputId">
      {{ label }}
      <code class="cli-binary-hint">{{ toolName }}</code>
      <i
        v-if="helpTooltip"
        class="material-icons"
        style="padding-left: 0.25rem"
        v-tooltip="{ content: helpTooltip, html: true }"
      >help_outlined</i>
    </label>

    <!-- Filled state: show a compact card with the resolved path. -->
    <div
      v-if="value"
      class="cli-path-filled-card"
    >
      <i class="material-icons cli-path-filled-icon">check_circle</i>
      <span
        class="cli-path-filled-path"
        :title="value"
      >{{ value }}</span>
      <button
        class="cli-path-clear-btn"
        type="button"
        title="Clear"
        @click.prevent="clearValue"
      >
        <i class="material-icons">close</i>
      </button>
    </div>

    <!-- Empty state: picker + Find button + warning when discovery failed. -->
    <template v-else>
      <div
        class="alert alert-danger alert-centered"
        v-show="cliError"
      >
        <i class="material-icons">error_outline</i>
        <div>
          No CLI found. See the Beekeeper Studio docs for setup help. <a :href="docsHref">Read more</a>.
        </div>
      </div>
      <file-picker
        :value="value"
        @input="onPick"
        :input-id="inputId"
        :options="filePickerOptions"
      >
        <template #actions>
          <div class="input-group-append">
            <a
              type="button"
              class="btn btn-flat btn-icon"
              v-tooltip="`Automatically find ${toolName}`"
              @click.prevent="findCli(true)"
            >
              <i class="material-icons">search</i>
              <span>Find</span>
            </a>
          </div>
        </template>
      </file-picker>
    </template>
  </div>
</template>

<script>
import FilePicker from '@/components/common/form/FilePicker.vue'

// Shared CLI binary path picker used by the Azure (`az`) and AWS (`aws`) auth
// forms. Mirrors the backup-tool "binary location" pattern from
// BaseCommandClient.ts: a file picker that returns symlinks unresolved on
// macOS, plus a "Find" action that runs `which`/`where` (extended with the
// Homebrew bin dirs on macOS) via the shared `cli/which` handler.
//
// UI states mirror SettingsInput.vue: when a path is set, render a compact
// card with a clear button. When empty, render the picker + Find button, with
// the "NO CLI FOUND" alert shown only after a discovery attempt has failed.
export default {
  components: { FilePicker },
  props: {
    value: { type: String, default: null },
    // Binary name passed to `which`/`where`, e.g. "az" or "aws".
    toolName: { type: String, required: true },
    label: { type: String, required: true },
    docsHref: { type: String, required: true },
    helpTooltip: { type: String, default: null },
    // Auto-run discovery when the component mounts. Discovery still backs off
    // when there's already a value, so it never clobbers a manual setting.
    autoDiscoverOnMount: { type: Boolean, default: true },
  },
  data() {
    return { cliError: false }
  },
  computed: {
    inputId() {
      return `cli-path-${this.toolName}`;
    },
    filePickerOptions() {
      // macOS's native open panel resolves a chosen symlink (e.g.
      // /opt/homebrew/bin/az) to its version-pinned Homebrew target, which
      // breaks after `brew upgrade`. noResolveAliases keeps the stable symlink
      // path. Electron applies it on macOS and silently ignores it elsewhere.
      return { properties: ['openFile', 'noResolveAliases'] };
    },
  },
  methods: {
    onPick(value) {
      if (value) this.cliError = false;
      this.$emit('input', value);
    },
    clearValue() {
      this.cliError = false;
      this.$emit('input', null);
    },
    // Run `which`/`where`. When `force` is false (mount-time auto-discovery),
    // skip if a value is already set so a manually-chosen path is preserved
    // across re-mounts of the form. Toast feedback is only shown when the user
    // explicitly clicked Find (force=true) — auto-discovery is silent.
    //
    // `cli/which` spawns a subprocess that can take 100+ms; during the await
    // the user may pick a file or trigger another discovery. Snapshot the
    // value first and bail before emitting if it changed externally — last
    // action wins. The toast is suppressed in that case too, since a
    // superseded result reporting "could not find" would be confusing.
    async findCli(force = false) {
      if (!force && this.value) return;
      const initial = this.value;
      try {
        const result = await this.$util.send('cli/which', { toolName: this.toolName });
        if (this.value !== initial) return;
        if (result) {
          this.cliError = false;
          this.$emit('input', result);
          if (force) this.$noty.success(`Found ${this.toolName} at ${result}`);
        } else {
          this.cliError = true;
          if (force) this.$noty.error(`Unable to find "${this.toolName}", please select it manually`);
        }
      } catch (_e) {
        if (this.value !== initial) return;
        this.cliError = true;
        if (force) this.$noty.error(`Unable to find "${this.toolName}", please select it manually`);
      }
    },
  },
  mounted() {
    if (this.autoDiscoverOnMount) this.findCli();
  },
};
</script>

<style lang="scss" scoped>
.cli-binary-hint {
  margin-left: 0.35rem;
  padding: 0.05rem 0.3rem;
  border-radius: 3px;
  font-size: 0.8em;
  font-family: var(--bks-text-editor-font-family, monospace);
  background: var(--bks-query-editor-bg, rgba(0, 0, 0, 0.12));
  opacity: 0.85;
}

.cli-path-filled-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--bks-border-color, rgba(255, 255, 255, 0.1));
  border-radius: 4px;
  background: var(--bks-query-editor-bg, rgba(0, 0, 0, 0.1));
}

.cli-path-filled-icon {
  font-size: 18px;
  color: var(--bks-brand-success, #4caf50);
  flex-shrink: 0;
}

.cli-path-filled-path {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.85rem;
  opacity: 0.85;
}

.cli-path-clear-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  margin: 0;
  min-width: 0;
  width: 22px;
  height: 22px;
  background: none;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  opacity: 0.4;
  color: inherit;

  &:hover {
    opacity: 1;
    // currentColor inherits from the text colour, which inverts per theme,
    // so this hover overlay works on both dark and light backgrounds.
    background: color-mix(in srgb, currentColor 10%, transparent);
  }

  .material-icons {
    font-size: 16px;
  }
}
</style>

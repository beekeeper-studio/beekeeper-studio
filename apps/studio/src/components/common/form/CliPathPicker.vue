<template>
  <div class="form-group">
    <label :for="inputId">
      {{ label }}
      <i
        v-if="helpTooltip"
        class="material-icons"
        style="padding-left: 0.25rem"
        v-tooltip="{ content: helpTooltip, html: true }"
      >help_outlined</i>
    </label>
    <div
      class="alert alert-danger"
      v-show="!cliFound"
    >
      <i class="material-icons-outlined">warning</i>
      <div>
        NO CLI FOUND, Please refer to our
        <a :href="docsHref">Beekeeper Docs</a>
        for more information
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
  </div>
</template>

<script>
import FilePicker from '@/components/common/form/FilePicker.vue'

// Shared CLI binary path picker used by the Azure (`az`) and AWS (`aws`) auth
// forms. Mirrors the backup-tool "binary location" pattern from
// BaseCommandClient.ts: a file picker that returns symlinks unresolved on
// macOS, plus a "Find" action that runs `which`/`where` (extended with the
// Homebrew bin dirs on macOS) via the shared `cli/which` handler.
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
    cliFound() {
      return !!this.value && !this.cliError;
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
          this.$emit('found', result);
          if (force) this.$noty.success(`Found ${this.toolName} at ${result}`);
        } else {
          this.cliError = true;
          this.$emit('input', null);
          this.$emit('found', null);
          if (force) this.$noty.error(`Unable to find "${this.toolName}", please select it manually`);
        }
      } catch (_e) {
        if (this.value !== initial) return;
        this.cliError = true;
        this.$emit('input', null);
        this.$emit('found', null);
        if (force) this.$noty.error(`Unable to find "${this.toolName}", please select it manually`);
      }
    },
  },
  mounted() {
    if (this.autoDiscoverOnMount) this.findCli();
  },
};
</script>

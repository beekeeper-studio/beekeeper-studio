<template>
  <statusbar
    :active="active"
    :class="{ 'empty': !results || results.length === 0, 'query-meta': true }"
  >
    <slot name="left-actions" />
    <template v-if="results?.length > 0">
      <div
        id="query-editor-statusbar"
        class="truncate statusbar-info"
        v-hotkey="keymap"
      >
        <span
          v-show="results?.length > 1"
          class="statusbar-item result-selector"
          :title="'Results'"
        >
          <div
            class="select-wrap"
            v-tooltip="{ content: 'More query results in here', placement: 'top', show: showHint, trigger: 'manual', classes: ['tooltip-info'] }"
          >
            <select
              name="resultSelector"
              id="resultSelector"
              @change="selectedResult = parseInt($event.target.value)"
              class="form-control"
              @mouseover="showSwitch = editing && changesCount > 0"
              @mouseleave="showSwitch = false"
              :disabled="editing && changesCount > 0"
              v-tooltip="{ content: 'Discard or apply your changes to switch result sets', trigger: 'manual', show: showSwitch }"
            >
              <option
                v-for="(resultOption, index) in results"
                :selected="value == index"
                :key="index"
                :value="index"
              >
                Result {{ index + 1 }}: {{ shortNum(resultOption.rows.length, 0) }} {{ $pluralize('row', resultOption.rows.length, false) }}
              </option>
            </select>
          </div>
        </span>
        <div
          class="statusbar-item row-counts"
          v-if="rowCount > 0"
          v-tooltip="`${rowCount} Records${result && result.truncated ? ' (Truncated) - get the full resultset in the Download menu' : ''}`"
        >
          <i class="material-icons">list_alt</i>
          <span class="num-rows">{{ rowCount }}</span>
          <span
            class="truncated-rows"
            v-if="result && result.truncated"
          >/&nbsp;{{ result.totalRowCount }}</span>
        </div>
        <div
          class="statusbar-item affected-rows"
          v-if="affectedRowsText"
          :title="affectedRowsText + ' ' + 'Rows Affected'"
        >
          <i class="material-icons">clear_all</i>
          <span>{{ affectedRowsText }} affected</span>
        </div>
        <span
          class="statusbar-item execute-time "
          v-if="executeTimeText"
          :title="executionTimeTitle"
        >
          <i class="material-icons">update</i>
          <span>{{ executeTimeText }}</span>
        </span>
      </div>
    </template>
    <template v-else>
      <span class="empty">No Data</span>
      <span
        class="statusbar-item execute-time"
        v-if="this.elapsedTime > 1"
      >
        <i class="material-icons">access_time</i>
        <span>{{ elapsedTimeText }}</span>
      </span>
    </template>
    <span class="expand" />
    <x-button
      v-if="canEdit && editing && changesCount > 0"
      class="btn btn-flat"
      @click.prevent="discardChanges"
    >
      Reset
    </x-button>
    <x-buttons v-if="canEdit && editing && changesCount > 0" class="pending-changes">
      <x-button
        class="btn btn-primary btn-badge btn-icon"
        @click.prevent="saveChanges"
        v-tooltip="`Apply ${changesString}`"
      >
        <span
          class="badge"
        >
          <small>{{ changesCount }}</small>
        </span>
        <span>Apply</span>
      </x-button>
      <x-button
        class="btn btn-primary"
        menu
      >
        <i class="material-icons">arrow_drop_down</i>
        <x-menu>
          <x-menuitem @click.prevent="saveChanges">
            <x-label>Apply</x-label>
            <!-- TODO (@day): Keyboard shortcut?? -->
          </x-menuitem>
          <x-menuitem @click.prevent="copyToSql">
            <x-label>Copy to SQL</x-label>
          </x-menuitem>
        </x-menu>
      </x-button>
    </x-buttons>
    <span
      v-tooltip="editButtonTooltip"
    >
      <x-button
        v-if="canEdit && !editing"
        :disabled="results?.length === 0 || !resultEditable || usedConfig.readOnlyMode"
        class="btn btn-flat btn-icon"
        id="edit-data-btn"
        @click.prevent="editResults"
      >
        <i class="material-icons">edit</i>
        Edit Data
      </x-button>
    </span>
    <x-button
      v-if="canEdit && editing && changesCount <= 0"
      class="btn btn-flat"
      @click.prevent="stopEditing"
    >
      Stop Editing
    </x-button>
    <x-button
      class="btn btn-flat btn-icon end"
      :disabled="results?.length === 0"
      @click.prevent="openDownloadMenu($event)"
    >
      Download <i class="material-icons">arrow_drop_down</i>
    </x-button>
    <x-button
      class="actions-btn btn btn-flat settings-btn"
      @click.prevent="openSettingsMenu($event)"
      title="Editor Settings"
    >
      <i class="material-icons">settings</i>
      <i class="material-icons">arrow_drop_down</i>
    </x-button>
  </statusbar>
</template>
<script>
import humanizeDuration from 'humanize-duration';
import Statusbar from '../common/StatusBar.vue';
import { mapState, mapGetters } from 'vuex';
import { AppEvent } from '@/common/AppEvent';
import formatSeconds from "@/lib/time/formatSeconds";

const shortEnglishHumanizer = humanizeDuration.humanizer({
  language: "shortEn",
  languages: {
    shortEn: {
      y: () => "y",
      mo: () => "mo",
      w: () => "w",
      d: () => "d",
      h: () => "h",
      m: () => "m",
      s: () => "s",
      ms: () => "ms",
    },
  },
});

export default {
  props: ['results', 'running', 'value', 'executeTime', 'wrapText', 'active', 'elapsedTime', 'editing', 'changesCount', 'changesString', 'resultEditable'],
  components: { Statusbar },
  data() {
    return {
      showHint: false,
      showSwitch: false,
      selectedResult: 0
    }
  },

  watch: {
    value(newValue, oldValue) {
      // fixes bug where result doesn't change because selectedResult doesn't change
      // FIXME: We shouldn't be storing selectedResult state at all,
      // just relying on the value prop and emitting 'input'
      if (this.selectedResult !== newValue)
        this.selectedResult = newValue
    },
    results() {
      if (this.results && this.results.length > 1 && !this.hasUsedDropdown) {
        this.showHint = true
        setTimeout(() => this.showHint = false, 2000)
      }
    },
    selectedResult(newValue, oldValue) {
      this.$emit('input', this.selectedResult);
      if (this.hasUsedDropdown === false) {
        this.hasUsedDropdown = true
      }
    }
  },
  computed: {
    ...mapGetters(['dialect', 'dialectData']),
    ...mapState('settings', ['settings']),
    ...mapState(['usedConfig']),
    userKeymap: {
      get() {
        const value = this.settings?.keymap.value;
        return value && this.keymapTypes.map(k => k.value).includes(value) ? value : 'default';
      },
      set(value) {
        if (value === this.userKeymap || !this.keymapTypes.map(k => k.value).includes(value)) return;
        this.trigger(AppEvent.switchUserKeymap, value)
      }
    },
    keymapTypes() {
      return this.$config.defaults.keymapTypes
    },
    hasUsedDropdown: {
      get() {
        return this.settings?.hideResultsDropdown?.value ?? false
      },
      set(value) {
        this.$store.dispatch('settings/save', { key: 'hideResultsDropdown', value })
      }
    },
    rowCount() {
      return this.result && this.result.rows ? this.result.rows.length : 0
    },
    result() {
      return this.results[this.value]
    },
    affectedRowsText() {
      if (!this.result) {
        return null
      }
      const rows = this.result.affectedRows || 0
      return `${rows}`
    },
    executeTimeText() {
      if (!this.executeTime) {
        return null
      }
      const executeTime = this.executeTime || 0

      return (executeTime < 5000) ? `${executeTime}ms` : shortEnglishHumanizer(executeTime)
    },
    executionTimeTitle() {
      if (!this.executeTime) {
        return null;
      }
      return `Execution time: ${humanizeDuration(this.executeTime)}`
    },
    elapsedTimeText() {
      return formatSeconds(this.elapsedTime);
    },
    downloadFullTooltip() {
      if (this.result?.truncated) {
        return `Re - run the query and send the full result to a file${ this.result?.truncated ? ' (' + this.result.totalRowCount + ' rows)' : '' }`
      }
      return `Only needed for result sets that have been truncated (Beekeeper will tell you if this happens)`
    },
    keymap() {
      return this.$vHotkeyKeymap({
        'queryEditor.selectNextResult': this.changeSelectedResult.bind(this, 1),
        'queryEditor.selectPreviousResult': this.changeSelectedResult.bind(this, -1),
      })
    },
    canEdit() {
      return !this.dialectData?.disabledFeatures?.resultEditing;
    },
    editButtonTooltip() {
      if (this.usedConfig?.readOnlyMode) {
        return "Read Only Mode is enabled for this connection. Editing is disabled.";
      } else if (this.resultEditable) {
        return "Edit table data directly from query results";
      } else {
        return "There is not enough information in the result set to generate an update query.";
      }
    }
  },
  methods: {
    changeSelectedResult(direction) {
      const newIndex =  this.selectedResult + direction;
      if (newIndex >= 0 && newIndex < this.results?.length) {
        this.selectedResult = newIndex;
      }
    },
    // Attribution: https://stackoverflow.com/questions/10599933/convert-long-number-into-abbreviated-string-in-javascript-with-a-special-shortn/10601315
    shortNum(num, fixed) {
      // fix "TypeError: Cannot read property 'toPrecision' of undefined" (after INSERT and CREATE TABLE commands)
      if (num === null || typeof num === 'undefined') { return null; } // terminate early

      if (num === 0) { return '0'; } // terminate early
      fixed = (!fixed || fixed < 0) ? 0 : fixed; // number of decimal places to show
      const b = (num).toPrecision(2).split("e"), // get power
        k = b.length === 1 ? 0 : Math.floor(Math.min(b[1].slice(1), 14) / 3), // floor at decimals, ceiling at trillions
        c = k < 1 ? num.toFixed(0 + fixed) : (num / Math.pow(10, k * 3)).toFixed(1 + fixed), // divide by power
        d = c < 0 ? c : Math.abs(c), // enforce -0 is 0
        e = d + ['', 'K', 'M', 'B', 'T'][k]; // append power
      return e;
    },
    stopEditing() {
      this.$emit('stopEditing');
    },
    editResults() {
      this.$emit('editResults');
    },
    saveChanges() {
      this.$emit('saveChanges');
    },
    copyToSql() {
      this.$emit('copyToSql');
    },
    discardChanges() {
      this.$emit('discardChanges');
    },
    download(format) {
      this.$emit('download', format)
    },
    copyToClipboard() {
      this.$emit('clipboard')
    },
    copyToClipboardJson() {
      this.$emit('clipboardJson')
    },
    copyToClipboardMarkdown() {
      this.$emit('clipboardMarkdown')
    },
    submitCurrentQueryToFile() {
      this.$emit('submitCurrentQueryToFile')
    },
    openSettingsMenu(event) {
      const options = [
        {
          id: 'editor-keymap-header',
          label: 'Editor keymap',
          disabled: true,
        },
        ...this.keymapTypes.map(t => ({
          id: `keymap-${t.value}`,
          label: t.name,
          checked: t.value === this.userKeymap,
          handler: () => {
            this.userKeymap = t.value;
          },
        })),
        {
          id: 'wrap-text',
          label: 'Wrap Text',
          checked: Boolean(this.wrapText),
          handler: () => {
            this.$emit('wrap-text');
          },
        },
      ];
      this.$bks.openMenu({ event, item: null, options });
    },
    openDownloadMenu(event) {
      const options = [
        {
          label: 'Download as CSV',
          handler: () => this.download('csv'),
        },
        {
          label: 'Download as Excel',
          handler: () => this.download('xlsx'),
        },
        {
          label: 'Download as JSON',
          handler: () => this.download('json'),
        },
        {
          label: 'Download as Markdown',
          handler: () => this.download('md'),
        },
      ];

      if (this.dialect !== 'mongodb') {
        options.push({
          label: 'Download Full Resultset',
          disabled: !(this.result && this.result.truncated),
          handler: () => this.submitCurrentQueryToFile(),
        });
      }

      options.push(
        { type: 'divider' },
        {
          label: 'Copy to Clipboard (TSV / Excel)',
          handler: () => this.copyToClipboard(),
        },
        {
          label: 'Copy to Clipboard (JSON)',
          handler: () => this.copyToClipboardJson(),
        },
        {
          label: 'Copy to Clipboard (Markdown)',
          handler: () => this.copyToClipboardMarkdown(),
        }
      );

      this.$bks.openMenu({ event, item: null, options });
    },
  }
}
</script>

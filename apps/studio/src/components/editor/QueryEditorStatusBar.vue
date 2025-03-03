<template>
  <statusbar :class="{ 'empty': results.length === 0, 'query-meta': true }">
    <template v-if="results.length > 0">
      <div
        class="truncate statusbar-info"
        v-hotkey="keymap"
      >
        <span
          v-show="results.length > 1"
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
              @change="selectedResult = parseInt($event.target.value);"
              class="form-control"
            >
              <option
                v-for="(resultOption, index) in results"
                :selected="value == index"
                :key="index"
                :value="index"
              >
                Result {{ index + 1 }}: {{ shortNum(resultOption.rows.length, 0) }} {{ pluralize('row', resultOption.rows.length, false) }}
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
      <span class="expand" />
      <span class="empty">No Data</span>
    </template>
    <div class="flex flex-right statusbar-right-actions">
      <x-button
        class="btn btn-flat btn-icon end"
        :disabled="results.length === 0"
        menu
      >
        Download <i class="material-icons">arrow_drop_down</i>
        <x-menu>
          <x-menuitem @click.prevent="download('csv')">
            <x-label>Download as CSV</x-label>
          </x-menuitem>
          <x-menuitem @click.prevent="download('xlsx')">
            <x-label>Download as Excel</x-label>
          </x-menuitem>
          <x-menuitem @click.prevent="download('json')">
            <x-label>Download as JSON</x-label>
          </x-menuitem>
          <x-menuitem @click.prevent="download('md')">
            <x-label>Download as Markdown</x-label>
          </x-menuitem>
          <span
            v-tooltip="{
              content: downloadFullTooltip
            }"
          >
            <x-menuitem
              @click.prevent="$event => submitCurrentQueryToFile()"
              :disabled="!(result && result.truncated)"
            >
              <x-label>Download Full Resultset</x-label>
              <i
                v-if="$store.getters.isCommunity"
                class="material-icons menu-icon"
              >stars</i>
            </x-menuitem>
          </span>
          <hr>
          <x-menuitem
            title="Probably don't do this with large results (500+)"
            @click.prevent="copyToClipboard"
          >
            <x-label>Copy to Clipboard (TSV / Excel)</x-label>
          </x-menuitem>
          <x-menuitem
            title="Probably don't do this with large results (500+)"
            @click.prevent="copyToClipboardJson"
          >
            <x-label>Copy to Clipboard (JSON)</x-label>
          </x-menuitem>
          <x-menuitem
            title="Probably don't do this with large results (500+)"
            @click.prevent="copyToClipboardMarkdown"
          >
            <x-label>Copy to Clipboard (Markdown)</x-label>
          </x-menuitem>
        </x-menu>
      </x-button>
      <x-button
        class="actions-btn btn btn-flat settings-btn"
        menu
      >
        <i class="material-icons">settings</i>
        <i class="material-icons">arrow_drop_down</i>
        <x-menu>
          <x-menuitem disabled>
            <x-label>Editor keymap</x-label>
          </x-menuitem>
          <x-menuitem
            :key="t.value"
            v-for="t in keymapTypes"
            @click.prevent="userKeymap = t.value"
          >
            <x-label class="flex-between">
              {{ t.name }}
              <span
                class="material-icons"
                v-if="t.value === userKeymap"
              >done</span>
            </x-label>
          </x-menuitem>
        </x-menu>
      </x-button>
    </div>
  </statusbar>
</template>
<script>
import humanizeDuration from 'humanize-duration'
import Statusbar from '../common/StatusBar.vue'
import { mapState, mapGetters } from 'vuex';
import { AppEvent } from '@/common/AppEvent'

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
  props: ['results', 'running', 'value', 'executeTime'],
  components: { Statusbar },
  data() {
    return {
      showHint: false,
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
    ...mapState('settings', ['settings']),
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
        return this.settings?.hideResultsDropdown.value ?? false
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
    downloadFullTooltip() {
      if (this.result?.truncated) {
        return `Re - run the query and send the full result to a file${ this.result?.truncated ? ' (' + this.result.totalRowCount + ' rows)' : '' }`
      }
      return `Only needed for result sets that have been truncated (Beekeeper will tell you if this happens)`
    },
    keymap() {
      const result = {}
      result['shift+up'] = () => this.changeSelectedResult(-1);
      result['shift+down'] = () => this.changeSelectedResult(1);
      return result
    }
  },
  methods: {
    changeSelectedResult(direction) {
      const newIndex =  this.selectedResult + direction;
      if (newIndex >= 0 && newIndex < this.results.length) {
        this.selectedResult = newIndex;
      }
    },
    pluralize(word, amount, flag) {
      return window.main.pluralize(word, amount, flag)
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
  }
}
</script>

<template>
  <statusbar :class="{'empty': results.length === 0, 'query-meta': true}">
    <template v-if="results.length > 0">
      <div class="truncate statusbar-info">
        <span v-show="results.length > 1" class="statusbar-item result-selector" :title="'Results'">
        <div class="select-wrap" v-tooltip="{content: 'More query results in here', placement: 'top', show: showHint, trigger: 'manual', classes: ['tooltip-info']}">
          <select name="resultSelector" id="resultSelector" @change="updateValue" class="form-control">
            <option v-for="(result, index) in results" :selected="value == index" :key="index" :value="index">Result {{index + 1}}: {{shortNum(result.rows.length, 0)}} {{pluralize('row', result.rows.length, false)}}</option>
          </select>
        </div>
        </span>
        <div class="statusbar-item row-counts" v-if="rowCount > 0" :title="`${rowCount} Records${result.truncated ? ' (Truncated)' : ''}`">
          <i class="material-icons">list_alt</i>
          <span class="num-rows">{{rowCount}}</span>
          <span class="truncated-rows" v-if="result && result.truncated">/&nbsp;{{result.totalRowCount}}</span>
        </div>
        <div class="statusbar-item affected-rows" v-if="affectedRowsText " :title="affectedRowsText + ' ' + 'Rows Affected'">
          <i class="material-icons">clear_all</i>
          <span>{{ affectedRowsText }} affected</span>
        </div>
        <span class="statusbar-item execute-time " v-if="executeTimeText" :title="executionTimeTitle">
          <i class="material-icons">update</i>
          <span>{{executeTimeText}}</span>
        </span>

      </div>
    </template>
    <template v-else>
      <span class="expand"></span>
      <span class="empty">No Data</span>
    </template>
    <div class="flex-right">
      <x-button class="btn btn-flat btn-icon end" :disabled="results.length === 0" menu>
        Download <i class="material-icons">arrow_drop_down</i>
        <x-menu>
          <x-menuitem @click.prevent="download('csv')">
            <x-label>CSV</x-label>
          </x-menuitem>
          <x-menuitem @click.prevent="download('xlsx')">
            <x-label>Excel</x-label>
          </x-menuitem>
          <x-menuitem @click.prevent="download('json')">
            <x-label>JSON</x-label>
          </x-menuitem>
          <x-menuitem @click.prevent="download('md')">
            <x-label>Markdown</x-label>
          </x-menuitem>
          <hr>
          <x-menuitem title="Probably don't do this with large results (500+)" @click.prevent="copyToClipboard">
            <x-label>Copy to Clipboard (TSV / Excel)</x-label>
          </x-menuitem>
          <x-menuitem title="Probably don't do this with large results (500+)" @click.prevent="copyToClipboardJson">
            <x-label>Copy to Clipboard (JSON)</x-label>
          </x-menuitem>
          <x-menuitem title="Probably don't do this with large results (500+)" @click.prevent="copyToClipboardMarkdown">
            <x-label>Copy to Clipboard (Markdown)</x-label>
          </x-menuitem>
        </x-menu>
      </x-button>

    </div>
  </statusbar>
</template>
<script>
// import Pluralize from 'pluralize'
import humanizeDuration from 'humanize-duration'
import Statusbar from '../common/StatusBar'
import pluralize from 'pluralize'
import { UserSetting } from '@/common/appdb/models/user_setting';
import { mapState } from 'vuex';

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

      }
    },

    watch: {
      results() {
        if (this.results && this.results.length > 1 && !this.hasUsedDropdown) {
          this.showHint = true
          setTimeout(() => this.showHint = false, 2000)
        }
      }
    },
    computed: {
      ...mapState('settings', ['settings']),
      hasUsedDropdown: {
        get() {
          const s = this.settings.hideResultsDropdown
          return s ? s.value : false
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
        return shortEnglishHumanizer(executeTime)
      },
      executionTimeTitle() {
        if (!this.executeTime) {
          return null;
        }
        return `Execution time: ${humanizeDuration(this.executeTime)}`
      }
    },
    mounted() {
    },
    methods: {
      pluralize(word, amount, flag) {
        return pluralize(word, amount, flag)
      },
      // Attribution: https://stackoverflow.com/questions/10599933/convert-long-number-into-abbreviated-string-in-javascript-with-a-special-shortn/10601315
      shortNum(num, fixed) {
        // fix "TypeError: Cannot read property 'toPrecision' of undefined" (after INSERT and CREATE TABLE commands)
        if (num === null || typeof num === 'undefined') { return null; } // terminate early

        if (num === 0) { return '0'; } // terminate early
        fixed = (!fixed || fixed < 0) ? 0 : fixed; // number of decimal places to show
        const b = (num).toPrecision(2).split("e"), // get power
            k = b.length === 1 ? 0 : Math.floor(Math.min(b[1].slice(1), 14) / 3), // floor at decimals, ceiling at trillions
            c = k < 1 ? num.toFixed(0 + fixed) : (num / Math.pow(10, k * 3) ).toFixed(1 + fixed), // divide by power
            d = c < 0 ? c : Math.abs(c), // enforce -0 is 0
            e = d + ['', 'K', 'M', 'B', 'T'][k]; // append power
        return e;
      },
      updateValue(event) {
        this.$emit('input', parseInt(event.target.value))
        this.hasUsedDropdown = true
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
    }
}
</script>

<template>
  <statusbar :class="{'empty': results.length === 0, 'query-meta': true}">
    <template v-if="results.length > 0">
      <span v-show="results.length > 1" class="statusbar-item result-selector" :title="'Results'">
      <div class="select-wrap">
        <select name="resultSelector" id="resultSelector" @change="updateValue" class="form-control">
          <option v-for="(result, index) in results" :selected="value == index" :key="index" :value="index">Result {{index + 1}}</option>
        </select>
      </div>
      </span>
      <div class="statusbar-item row-counts row flex-middle" v-if="rowCount > 0" :title="'Records Displayed'">
      <span class="num-rows">{{rowCount}}</span>
      <span class="truncated-rows" v-if="result && result.truncated">/&nbsp;{{result.truncatedRowCount}}</span>
      <span class="records">records</span>
      </div>
      <span class="statusbar-item affected-rows" v-if="affectedRowsText " :title="'Rows Affected'">{{ affectedRowsText}}</span>
      <span class="statusbar-item execute-time row flex-middle" v-if="executeTimeText" :title="'Execution Time'">
      <i class="material-icons">update</i>
      <span>{{executeTimeText}}</span>
      </span>
      <span class="expand"></span>
    </template>
    <template v-else>
      <span class="expand"></span>
      <span class="empty">No Data</span>
    </template>
    <x-buttons class="download-results" v-if="result">
      <x-button class="btn btn-link btn-small" v-tooltip="'Download Results (CSV)'" @click.prevent="download('csv')">
      Download
      </x-button>
      <x-button class="btn btn-link btn-small" menu>
      <i class="material-icons">arrow_drop_down</i>
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
        <hr>
        <x-menuitem @click.prevent="copyToClipboard">
          <x-label>Copy to Clipboard</x-label>
        </x-menuitem>
      </x-menu>
      </x-button>
    </x-buttons>
  </statusbar>
</template>
<script>
import Pluralize from 'pluralize'
import humanizeDuration from 'humanize-duration'
import Statusbar from '../common/StatusBar'

export default {
    props: ['results', 'value', 'executeTime'],
    components: { Statusbar },

    computed: {
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
        return `${rows} ${Pluralize('row', rows)} affected`
      },
      executeTimeText() {
        if (!this.executeTime) {
          return null
        }
        const executeTime = this.executeTime || 0
        return humanizeDuration(executeTime)
      },
    },
    mounted() {
    },
    methods: {
      updateValue(event) {
        this.$emit('input', event.target.value)
      },
      download(format) {
        this.$emit('download', format)
      },
      copyToClipboard() {
        this.$emit('clipboard')
      }
    }
}
</script>
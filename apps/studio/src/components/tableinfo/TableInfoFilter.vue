<template>
  <div class="table-info-filter">
    <i class="material-icons search-icon">search</i>
    <input
      class="filter-input"
      type="text"
      spellcheck="false"
      :placeholder="placeholder"
      v-model="query"
    >
    <!-- Kept in the layout when empty so the box doesn't grow on first keystroke -->
    <button
      class="clear-filter"
      :class="{ 'is-hidden': !query }"
      type="button"
      title="Clear filter"
      @click.prevent="clear"
    >
      <i class="material-icons">close</i>
    </button>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import _ from 'lodash'
import { Tabulator } from 'tabulator-tables'
import { structureFilter, tabulatorStructureColumns } from '@/lib/tableinfo/structure'

const DEBOUNCE_MS = 250

export default Vue.extend({
  props: {
    /**
     * The tabulator instance to filter. Null until the parent tab mounts it,
     * and swapped for a new instance whenever the parent rebuilds the table,
     * so the filter is re-applied whenever it changes.
     */
    tabulator: {
      type: Object as () => Tabulator,
      default: null,
    },
    placeholder: {
      type: String,
      default: 'Filter',
    },
  },
  data() {
    return {
      query: '',
      applied: false,
      // Debounced per instance, not on the prototype: every structure tab
      // mounts its own filter and they must not share a timer.
      debouncedApply: null as _.DebouncedFunc<() => void>,
    }
  },
  watch: {
    query() {
      this.debouncedApply()
    },
    tabulator: {
      immediate: true,
      handler(tabulator: Tabulator, old: Tabulator) {
        if (old) {
          old.off('tableBuilt', this.apply)
          old.off('dataFiltered', this.onDataFiltered)
        }
        // A rebuilt table starts out unfiltered. It also isn't filterable
        // until it has finished building, so try now and again once it
        // reports built -- whichever happens first wins.
        this.applied = false
        if (tabulator) {
          tabulator.on('tableBuilt', this.apply)
          tabulator.on('dataFiltered', this.onDataFiltered)
        }
        this.apply()
      },
    },
  },
  created() {
    this.debouncedApply = _.debounce(this.apply, DEBOUNCE_MS)
  },
  beforeDestroy() {
    this.debouncedApply.cancel()
  },
  methods: {
    apply() {
      if (!this.tabulator) return
      const term = this.query.trim().toLowerCase()

      if (!term) {
        if (this.applied) {
          this.applied = false
          this.tabulator.clearFilter(false)
        }
        this.$emit('matches', null)
        return
      }

      const fields = tabulatorStructureColumns(this.tabulator).map((c) => c.field)
      // A table that hasn't been built yet reports no columns, and filtering
      // on no columns would hide every row. Leave it to the tableBuilt pass.
      if (!fields.length) return

      this.tabulator.setFilter(structureFilter, { term, fields })
      this.applied = true
      this.emitMatches()
    },
    /** Keeps the match count fresh when the data reloads under an active filter. */
    onDataFiltered() {
      if (this.applied) this.emitMatches()
    },
    emitMatches() {
      this.$emit('matches', {
        matched: this.tabulator.getData('active').length,
        total: this.tabulator.getData().length,
      })
    },
    clear() {
      this.query = ''
      this.debouncedApply.cancel()
      this.apply()
    },
  },
})
</script>

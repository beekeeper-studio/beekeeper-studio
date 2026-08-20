<template>
  <div class="table-info-filter">
    <i class="material-icons search-icon">search</i>
    <input
      ref="input"
      class="filter-input"
      type="text"
      spellcheck="false"
      :placeholder="placeholder"
      v-model="query"
      @keydown.esc.prevent="close"
      @blur="onBlur"
    >
    <!-- The count and the clear button toggle with `visibility` so the input
         never changes width mid-typing -->
    <span
      class="filter-matches"
      :class="{ 'is-hidden': !matches }"
    >{{ matchLabel }}</span>
    <button
      class="clear-filter"
      :class="{ 'is-hidden': !query }"
      type="button"
      title="Clear filter"
      @click.prevent="close"
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
      matches: null as { matched: number; total: number },
      // Debounced per instance, not on the prototype: every structure tab
      // mounts its own filter and they must not share a timer.
      debouncedApply: null as _.DebouncedFunc<() => void>,
    }
  },
  computed: {
    matchLabel() {
      if (!this.matches) return ''
      return `${this.matches.matched}/${this.matches.total}`
    },
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
  mounted() {
    this.$refs.input.focus()
  },
  beforeDestroy() {
    // The field only exists while the search is open. Closing must never
    // leave a filtered table with no visible cause.
    this.debouncedApply.cancel()
    if (this.tabulator) {
      this.tabulator.off('tableBuilt', this.apply)
      this.tabulator.off('dataFiltered', this.onDataFiltered)
      if (this.applied) this.tabulator.clearFilter(false)
    }
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
        this.matches = null
        return
      }

      const fields = tabulatorStructureColumns(this.tabulator).map((c) => c.field)
      // A table that hasn't been built yet reports no columns, and filtering
      // on no columns would hide every row. Leave it to the tableBuilt pass.
      if (!fields.length) return

      this.tabulator.setFilter(structureFilter, { term, fields })
      this.applied = true
      this.updateMatches()
    },
    /** Keeps the match count fresh when the data reloads under an active filter. */
    onDataFiltered() {
      if (this.applied) this.updateMatches()
    },
    updateMatches() {
      this.matches = {
        matched: this.tabulator.getData('active').length,
        total: this.tabulator.getData().length,
      }
    },
    onBlur() {
      // Tabbing or clicking away from an empty field collapses it; with a
      // query typed the field stays, since it explains the filtered table.
      if (!this.query.trim()) this.$emit('close')
    },
    close() {
      this.query = ''
      this.debouncedApply.cancel()
      this.apply()
      this.$emit('close')
    },
  },
})
</script>

<template>
  <a
    class="btn statusbar-item"
    :class="{ 'is-cached': isCached }"
    @click.prevent="fetchTotalRecords"
    v-tooltip="hoverTitle"
  >
    <i class="material-icons">tag</i>
    <span v-if="fetchingTotalRecords">loading...</span>
    <span v-else-if="error">error</span>
    <span v-else-if="totalRecords === null">Unknown</span>
    <template v-else>
      <span>~{{ Number(totalRecords).toLocaleString() }}</span>
      <i
        v-if="isCached"
        class="material-icons cached-indicator"
      >cached</i>
    </template>
  </a>
</template>
<script lang="ts">
import Vue from 'vue'
import { mapState } from 'vuex'
import { joinFilters } from "@/common/utils"
import type { TableLengthEntry } from '@/store/modules/TableLengthModule'

export default Vue.extend({
  props: ['table', 'filters'],
  data: () => ({
    filteredTotalRecords: null as number | null,
    fallbackTotalRecords: null as number | null,
    localFetchedAt: null as number | null,
    fetchingTotalRecords: false,
    error: null as Error | null
  }),
  computed: {
    ...mapState(['connection', 'connected']),
    hasActiveFilters(): boolean {
      if (Array.isArray(this.filters)) return this.filters.length > 0
      if (typeof this.filters === 'string') return this.filters.trim().length > 0
      return false
    },
    hasStoreCache(): boolean {
      return typeof this.$store?.getters?.['tableLengths/getEntry'] === 'function'
    },
    cachedEntry(): TableLengthEntry | null {
      if (this.hasActiveFilters || !this.table || !this.hasStoreCache) return null
      return this.$store.getters['tableLengths/getEntry'](this.table)
    },
    totalRecords(): number | null {
      if (this.hasActiveFilters) return this.filteredTotalRecords
      if (this.hasStoreCache) return this.cachedEntry ? this.cachedEntry.count : null
      return this.fallbackTotalRecords
    },
    isCached(): boolean {
      if (this.hasActiveFilters || !this.cachedEntry) return false
      return this.localFetchedAt !== this.cachedEntry.fetchedAt
    },
    autoFetchRowCount(): boolean {
      return Boolean(this.$bksConfig?.ui?.tableTable?.autoFetchRowCount)
    },
    tableCacheId(): string {
      return `${this.table?.schema ?? ''}::${this.table?.entityType ?? ''}::${this.table?.name ?? ''}`
    },
    hoverTitle(): string {
      if (this.error) return this.error.message

      if (this.totalRecords === null)
        return 'Click to fetch total record count'

      const countText = Number(this.totalRecords).toLocaleString()
      if (this.isCached) {
        return `Approximately ${countText} Records (cached - click to refresh)`
      }
      return `Approximately ${countText} Records (click to refresh)`
    }
  },
  watch: {
    tableCacheId() {
      this.filteredTotalRecords = null
      this.fallbackTotalRecords = null
      this.localFetchedAt = null
      this.error = null
      this.$nextTick(() => this.maybeAutoFetch())
    },
    filters: {
      deep: true,
      handler() {
        this.filteredTotalRecords = null
        this.error = null
        if (!this.hasActiveFilters) {
          this.$nextTick(() => this.maybeAutoFetch())
        }
      }
    }
  },
  mounted() {
    this.$nextTick(() => this.maybeAutoFetch())
  },
  methods: {
    maybeAutoFetch() {
      if (!this.table || this.hasActiveFilters || !this.autoFetchRowCount) return
      if (this.cachedEntry || this.fetchingTotalRecords) return
      if (!this.connection || !this.connected) return
      this.fetchTotalRecords()
    },
    async fetchTotalRecords() {
      if (!this.table || !this.connection) return
      const requestTable = this.table
      const requestFilters = this.filters
      const usingFilters = this.hasActiveFilters

      this.fetchingTotalRecords = true

      try {
        this.error = null
        if (usingFilters) {
          let count: number
          if (Array.isArray(requestFilters)) {
            const allFilters = []
            for (const filter of requestFilters) {
              allFilters.push(await this.connection.getQueryForFilter(filter))
            }
            count = await this.connection.getFilteredDataCount(
              requestTable.name,
              requestTable.schema,
              joinFilters(allFilters, requestFilters)
            )
          } else {
            count = await this.connection.getFilteredDataCount(
              requestTable.name,
              requestTable.schema,
              requestFilters
            )
          }
          if (this.isSameTarget(requestTable) && this.hasActiveFilters) {
            this.filteredTotalRecords = Number(count) || 0
          }
        } else {
          const count = await this.connection.getTableLength(requestTable.name, requestTable.schema)
          if (this.hasStoreCache) {
            await this.$store.dispatch('tableLengths/setCount', { table: requestTable, count })
            if (this.isSameTarget(requestTable) && this.cachedEntry) {
              this.localFetchedAt = this.cachedEntry.fetchedAt
            }
          } else if (this.isSameTarget(requestTable)) {
            this.fallbackTotalRecords = count
          }
        }
      } catch (ex) {
        console.error("unable to fetch total records", ex)
        if (this.isSameTarget(requestTable)) {
          this.error = ex as Error
        }
      } finally {
        this.fetchingTotalRecords = false
      }
    },
    isSameTarget(target: { name?: string; schema?: string; entityType?: string }) {
      return (
        this.table?.name === target?.name &&
        this.table?.schema === target?.schema &&
        this.table?.entityType === target?.entityType
      )
    }
  }
})
</script>

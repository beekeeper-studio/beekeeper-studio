<template>
  <a
    class="statusbar-item hoverable"
    @click.prevent="refreshTotalRecords"
    v-tooltip="hoverTitle"
  >
    <i class="material-icons">tag</i>
    <span v-if="fetchingTotalRecords">loading...</span>
    <span v-else-if="error">error</span>
    <span v-else-if="totalRecords === null">Unknown</span>
    <span v-else>~{{ Number(totalRecords).toLocaleString() }}</span>
  </a>
</template>
<script lang="ts">
import Vue from 'vue'
import { mapState } from 'vuex'
import { joinFilters } from "@/common/utils"
import {
  buildRecordCountCacheKey,
  getCachedRecordCount,
  setCachedRecordCount,
} from './tableLengthCache'

export default Vue.extend({
  props: ['table', 'filters'],
  data: () => ({
    totalRecords: null,
    fetchingTotalRecords: false,
    error: null,
    fetchGeneration: 0,
  }),
  computed: {
    ...mapState(['connection']),
    fetchKey() {
      return buildRecordCountCacheKey(this.table, this.filters)
    },
    hoverTitle() {
      if (this.error) return this.error.message

      if (this.fetchingTotalRecords)
        return 'Fetching record count...'

      if (this.totalRecords === null)
        return 'Click to refresh record count'

      return `Approximately ${Number(this.totalRecords).toLocaleString()} Records`
    }
  },
  watch: {
    fetchKey: {
      handler(newKey, oldKey) {
        if (!newKey || newKey === oldKey) return
        this.scheduleFetch()
      },
      immediate: true,
    },
  },
  methods: {
    applyCachedResult(cacheKey: string) {
      const cached = getCachedRecordCount(cacheKey)
      if (!cached) return false

      this.totalRecords = cached.totalRecords
      this.error = cached.error
      return true
    },
    cacheResult(cacheKey: string) {
      setCachedRecordCount(cacheKey, {
        totalRecords: this.totalRecords,
        error: this.error,
      })
    },
    scheduleFetch() {
      if (!this.table || !this.fetchKey) return

      if (this.applyCachedResult(this.fetchKey)) return

      this.error = null
      this.totalRecords = null
      this.fetchTotalRecords()
    },
    refreshTotalRecords() {
      this.error = null
      this.fetchTotalRecords(true)
    },
    async fetchTotalRecords(bypassCache = false) {
      if (!this.table || !this.fetchKey) return

      const cacheKey = this.fetchKey
      if (!bypassCache && this.applyCachedResult(cacheKey)) return

      const generation = ++this.fetchGeneration
      this.fetchingTotalRecords = true

      try {
        const allFilters = []
        this.error = null
        if (Array.isArray(this.filters) && this.filters.length > 0 ) {
          for (const filter of this.filters) {
            allFilters.push(await this.connection.getQueryForFilter(filter))
            if (generation !== this.fetchGeneration) return
          }

          const count = await this.connection.getFilteredDataCount(this.table.name, this.table.schema, joinFilters(allFilters, this.filters))
          if (generation !== this.fetchGeneration) return
          this.totalRecords = count
        } else {
          const count = await this.connection.getTableLength(this.table.name, this.table.schema);
          if (generation !== this.fetchGeneration) return
          this.totalRecords = count
        }
        this.cacheResult(cacheKey)
      } catch (ex) {
        if (generation !== this.fetchGeneration) return
        console.error("unable to fetch total records", ex)
        this.totalRecords = 0
        this.error = ex
      } finally {
        if (generation === this.fetchGeneration) {
          this.fetchingTotalRecords = false
        }
      }
    },
  }
})
</script>

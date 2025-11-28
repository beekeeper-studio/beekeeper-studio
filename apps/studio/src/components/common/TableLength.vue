<template>
  <a
    class="statusbar-item hoverable"
    @click.prevent="fetchTotalRecords"
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

export default Vue.extend({
  props: ['table', 'filters'],
  data: () => ({
    totalRecords: null,
    fetchingTotalRecords: false,
    error: null
  }),
  computed: {
    ...mapState(['connection']),
    hoverTitle() {
      if (this.error) return this.error.message

      if (this.totalRecords === null)
        return 'Click to fetch total record count'

      return `Approximately ${Number(this.totalRecords).toLocaleString()} Records`
    }
  },
  methods: {
    async fetchTotalRecords() {
      this.fetchingTotalRecords = true
      
      try {
        const allFilters = []
        this.error = null
        if (Array.isArray(this.filters) && this.filters.length > 0 ) {
          for (const filter of this.filters) {
            allFilters.push(await this.connection.getQueryForFilter(filter))
          }

          this.totalRecords = await this.connection.getFilteredDataCount(this.table.name, this.table.schema, joinFilters(allFilters, this.filters))
        } else {
          this.totalRecords = await this.connection.getTableLength(this.table.name, this.table.schema);
        }
      } catch (ex) {
        console.error("unable to fetch total records", ex)
        this.totalRecords = 0
        this.error = ex
      } finally {
        this.fetchingTotalRecords = false
      }
    },
  }
})
</script>

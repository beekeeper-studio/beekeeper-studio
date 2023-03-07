<template>
  <a class="statusbar-item hoverable"
    @click.prevent="fetchTotalRecords"
    v-tooltip="hoverTitle"
  >
    <i class="material-icons">tag</i>
    <span v-if="fetchingTotalRecords">loading...</span>
    <span v-else-if="error">error</span>
    <span v-else-if="totalRecords === null">Unknown</span>
    <span v-else>~{{totalRecords.toLocaleString()}}</span>
  </a>
</template>
<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  props: ['table', 'connection'],
  data: () => ({
    totalRecords: null,
    fetchingTotalRecords: false,
    error: null
  }),
  computed: {
    hoverTitle() {
      if (this.error) return this.error.message

      if (this.totalRecords === null)
        return 'Click to fetch total record count'

      return `Approximately ${this.totalRecords} Records`
    }
  },
  methods: {
    async fetchTotalRecords() {
      this.fetchingTotalRecords = true
      try {
        this.error = null
        this.totalRecords = await this.connection.getTableLength(this.table.name, this.table.schema)
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

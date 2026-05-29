<template>
  <div class="table-properties">
    <div
      v-if="error"
      class="alert-wrapper"
    >
      <div class="alert alert-danger">
        {{ error.message }}
      </div>
    </div>

    <template v-else>
      <div class="table-properties-header tables-overview-header" />

      <div
        v-if="loading"
        class="table-properties-loading"
      >
        <x-progressbar />
      </div>

      <div
        class="table-properties-wrap"
        v-if="!loading"
      >
        <div class="table-info-table">
          <div class="table-info-table-wrap">
            <div class="center-wrap">
              <div class="table-subheader">
                <div class="table-title">
                  <h2>Tables Overview</h2>
                </div>
                <span class="expand" />
                <div class="actions">
                  <x-button
                    v-if="hasDatabaseOptimization"
                    class="btn btn-sm btn-flat"
                    title="Optimize database"
                    @click.prevent="optimizeDatabase"
                  >
                    Optimize Database
                  </x-button>
                  <a
                    @click.prevent="refresh"
                    class="btn btn-link btn-fab"
                    title="Refresh"
                  >
                    <i class="material-icons">refresh</i>
                  </a>
                </div>
              </div>

              <div
                v-if="!supportedFeatures.tableOverview"
                class="alert alert-info"
              >
                Tables overview is not supported for this database engine.
              </div>

              <div
                v-else-if="!rows.length"
                class="alert alert-info"
              >
                No tables overview data available.
              </div>

              <table
                v-else
                class="table table-condensed table-hover tables-overview-table"
              >
                <thead>
                  <tr>
                    <th @click="sortBy('tableName')">Table</th>
                    <th @click="sortBy('rowCount')">Rows</th>
                    <th @click="sortBy('totalSize')">Total Size</th>
                    <th @click="sortBy('tableSize')">Table Size</th>
                    <th @click="sortBy('indexSize')">Index Size</th>
                    <th v-if="hasFreeSpace" @click="sortBy('freeSpace')">Free Space</th>
                    <th v-if="hasFragmentation" @click="sortBy('fragmentation')">Fragmentation</th>
                    <th v-if="hasOptimizableRows">Action</th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="row in sortedRows"
                    :key="`${row.schemaName || 'default'}.${row.tableName}`"
                  >
                    <td>
                      <span v-if="row.schemaName">{{ row.schemaName }}.</span>{{ row.tableName }}
                    </td>
                    <td>{{ formatNumber(row.rowCount) }}</td>
                    <td>{{ formatBytes(row.totalSize) }}</td>
                    <td>{{ formatBytes(row.tableSize) }}</td>
                    <td>{{ formatBytes(row.indexSize) }}</td>
                    <td v-if="hasFreeSpace">{{ formatNullableBytes(row.freeSpace) }}</td>
                    <td v-if="hasFragmentation">{{ formatFragmentation(row.fragmentation) }}</td>
                    <td v-if="hasOptimizableRows">
                      <x-button
                        v-if="row.canOptimize"
                        class="btn btn-sm btn-flat"
                        :title="row.optimizationNote || 'Optimize table'"
                        @click.prevent="optimize(row)"
                      >
                        Optimize
                      </x-button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="expand" />

          <status-bar
            class="tabulator-footer"
            :active="active"
          >
            <div class="flex flex-middle statusbar-actions">
              <span class="statusbar-info col flex expand">
                <span class="statusbar-item">
                  {{ rows.length }} tables
                </span>
                <span class="statusbar-item">
                  {{ formatNumber(totalRows) }} rows
                </span>
                <span class="statusbar-item">
                  {{ formatBytes(totalSize) }} total size
                </span>
                <span 
                  v-if="overview.freeSpace !== null && overview.freeSpace !== undefined"
                  class="statusbar-item"
                >
                  {{ formatBytes(overview.freeSpace) }} free space
                </span>
              </span>
            </div>
          </status-bar>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import _ from 'lodash'
import { mapState } from 'vuex'
import { format as humanBytes } from 'bytes'
import rawLog from '@bksLogger'
import StatusBar from './common/StatusBar.vue'

const log = rawLog.scope('TabTablesOverview')

const emptyOverview = { tables: [], freeSpace: null, canOptimize: false, optimizationNote: null }

export default {
  props: ["tabId", "active", "tab"],

  components: {
    StatusBar
  },

  data() {
    return {
      initialized: false,
      loading: true,
      error: null,
      overview: emptyOverview,
      sortField: 'totalSize',
      sortDirection: 'desc'
    }
  },

  watch: {
    active() {
      if (this.active && !this.initialized) {
        this.initialize()
      }
    }
  },

  computed: {
    ...mapState(['connection', 'supportedFeatures']),

    rows() {
      return this.overview.tables
    },

    totalRows() {
      return this.rows.reduce((sum, row) => sum + Number(row.rowCount || 0), 0)
    },

    totalSize() {
      return this.rows.reduce((sum, row) => sum + Number(row.totalSize || 0), 0)
    },

    hasOptimizableRows() {
      return this.supportedFeatures.tableOptimization && this.rows.some((row) => row.canOptimize)
    },

    hasDatabaseOptimization() {
      return this.supportedFeatures.tableOptimization && this.overview.canOptimize
    },

    hasFragmentation() {
      return this.rows.some((row) => row.fragmentation !== null)
    },

    hasFreeSpace() {
      return this.rows.some((row) => row.freeSpace !== null)
    },

    sortedRows() {
      return _.orderBy(this.rows, [this.sortField], [this.sortDirection])
    }
  },

  methods: {
    async initialize() {
      log.info("initializing")
      this.initialized = true
      await this.refresh()
    },

    async refresh() {
      log.info("refresh")
      this.loading = true
      this.error = null

      try {
        if (!this.supportedFeatures.tableOverview) {
          this.overview = emptyOverview
          return
        }
        this.overview = await this.connection.getTablesOverview()
      } catch (ex) {
        this.error = ex
        this.overview = emptyOverview
      } finally {
        log.info("setting loaded = false")
        this.loading = false
      }
    },

    sortBy(field) {
      if (this.sortField === field) {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc'
      } else {
        this.sortField = field
        this.sortDirection = field === 'tableName' ? 'asc' : 'desc'
      }
    },

    formatBytes(value) {
      return humanBytes(value || 0)
    },

    formatNullableBytes(value) {
      if (value === null || value === undefined) return 'N/A'
      return humanBytes(value)
    },

    formatNumber(value) {
      return Number(value || 0).toLocaleString()
    },

    formatFragmentation(value) {
      if (value === null || value === undefined) return 'N/A'
      return `${Math.round(value * 100)}%`
    },

    async optimizeDatabase() {
      const confirmed = await this.$confirm(
        'Optimize database?',
        this.overview.optimizationNote || 'This operation may take time on large databases.'
      )

      if (!confirmed) return

      try {
        await this.connection.optimizeTable(null, null)
        this.$noty.success('Database optimized successfully')
        await this.refresh()
      } catch (ex) {
        this.$noty.error(`Error optimizing database: ${ex.message}`)
      }
    },

    async optimize(row) {
      const confirmed = await this.$confirm(
        `Optimize ${row.tableName}?`,
        row.optimizationNote || 'This operation may take time on large tables.'
      )

      if (!confirmed) return

      try {
        await this.connection.optimizeTable(row.tableName, row.schemaName)
        this.$noty.success(`${row.tableName} optimized successfully`)
        await this.refresh()
      } catch (ex) {
        this.$noty.error(`Error optimizing ${row.tableName}: ${ex.message}`)
      }
    }
  },



  async mounted() {
    if (this.active) {
      await this.initialize()
    }
  }
}
</script>

<style scoped>
.tables-overview-table th,
.tables-overview-table td {
  padding-right: 2rem;
  white-space: nowrap;
}

.tables-overview-table th:last-child,
.tables-overview-table td:last-child {
  padding-right: 0;
}
</style>

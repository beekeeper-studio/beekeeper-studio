<template>
  <base-modal
    name="drop-databases"
    :loading="loading"
    :closable="!loading"
    @submit="drop"
  >
    <template #title>
      <span class="text-danger">Drop Databases</span>
    </template>

    <error-alert :error="error" />

    <p class="alert alert-warning" aria-role="alert">
      Warning: You are about to permanently drop the selected databases.
    </p>

    <p>Select the databases you want to drop:</p>

    <div class="database-list">
      <div
        v-for="database in databases"
        :key="database.name"
        class="database-item"
      >
        <label
          :for="database.id"
          class="checkbox-group"
        >
          <input
            :id="database.id"
            v-model="database.checked"
            type="checkbox"
            class="form-control"
            :disabled="database.name === currentDatabase"
          >
          <span>
            {{ database.name }}
            <small v-if="database.name === currentDatabase">
              (currently connected)
            </small>
          </span>
        </label>
      </div>
    </div>

    <template #footer="{ close }">
      <button
        class="btn btn-flat"
        type="button"
        :disabled="loading"
        @click.prevent="close"
      >
        Cancel
      </button>

      <button
        class="btn btn-danger"
        type="submit"
        :disabled="loading || selectedDatabases.length === 0"
      >
        {{ loading ? '...' : 'Drop Databases' }}
      </button>
    </template>
  </base-modal>
</template>

<script lang="ts">
import Vue from 'vue'
import BaseModal from '@/components/common/modals/BaseModal.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import { AppEvent } from '@/common/AppEvent'
import { DatabaseElement } from '@/lib/db/types'
import { getDialectData } from '@shared/lib/dialects'
import { dialectFor } from '@shared/lib/dialects/models'
import { mapState } from 'vuex'

export default Vue.extend({
  components: {
    BaseModal,
    ErrorAlert
  },

  data() {
    return {
      databases: [],
      loading: false,
      error: null,
      isBeingDestroyed: false,
      sourceConnection: null,
      sourceUsedConfig: null,
      sourceConnectionType: null,
      sourceConnected: false,
    }
  },

  computed: {
    ...mapState(['connection', 'databaseList', 'connectionType', 'usedConfig', 'connected']),
    ...mapState({ currentDatabase: 'database' }),
    selectedDatabases() {
      return this.databases.filter(database => database.checked)
    },

    rootBindings() {
      return [
        {
          event: AppEvent.openDropDatabasesModal,
          handler: this.open
        }
      ]
    }
  },

  mounted() {
    this.registerHandlers(this.rootBindings)
  },

  beforeDestroy() {
    this.isBeingDestroyed = true
    this.unregisterHandlers(this.rootBindings)
  },

  methods: {
    open() {
      this.sourceConnection = this.connection
      this.sourceUsedConfig = this.usedConfig
      this.sourceConnectionType = this.connectionType
      this.sourceConnected = this.connected
      this.databases = this.databaseRows(this.databaseList || [], this.currentDatabase, this.connectionType)
      this.error = null
      this.$modal.show('drop-databases')
    },

    databaseRows(databaseList, currentDatabase, connectionType, checkedNames = []) {
      const protectedNamesByConnectionType: Record<string, string[]> = {
        mysql: ['mysql', 'information_schema', 'performance_schema', 'sys'],
        mariadb: ['mysql', 'information_schema', 'performance_schema', 'sys'],
        tidb: ['mysql', 'information_schema', 'performance_schema', 'sys'],
        starrocks: ['mysql', 'information_schema', 'performance_schema', 'sys'],
        postgresql: ['template0', 'template1'],
        cockroachdb: ['system'],
        greengage: ['template0', 'template1'],
        sqlserver: ['master', 'model', 'msdb', 'tempdb'],
        redshift: ['dev', 'padb_harvest', 'template0', 'template1', 'sys:internal'],
        clickhouse: ['system', 'information_schema'],
        snowflake: ['snowflake']
      }
      const protectedNames = protectedNamesByConnectionType[connectionType] || []
      return (databaseList || [])
        .filter(name => name !== currentDatabase && !protectedNames.includes(String(name).toLowerCase()))
        .map((name, index) => ({ name, id: `drop-db-${index}`, checked: checkedNames.includes(name) }))
    },

    async drop() {
      if (this.loading) return
      const selected = this.selectedDatabases.map(database => database.name)
      if (!selected.length) return

      this.loading = true
      this.error = null
      const originalConnection = this.sourceConnection
      const originalUsedConfig = this.sourceUsedConfig
      const originalUsedConfigId = originalUsedConfig?.id
      const originalConnectionType = this.sourceConnectionType
      const originalConnected = this.sourceConnected
      const originalDialect = originalConnectionType ? dialectFor(originalConnectionType) : null
      const supportsDropDatabase = originalDialect && getDialectData(originalDialect).supportsDropDatabase === true
      const isOriginalConnectionActive = () =>
        !this.isBeingDestroyed &&
        this.connection === originalConnection &&
        this.connectionType === originalConnectionType &&
        this.connected === originalConnected &&
        (originalUsedConfig
          ? this.usedConfig === originalUsedConfig && this.usedConfig?.id === originalUsedConfigId
          : this.usedConfig == null)
      const completed = []
      const failed = []
      const skipped = []
      let attemptedDrop = false
      let closeAfterDrop = false
      let refreshError = null

      try {
        if (
          supportsDropDatabase !== true ||
          !originalConnection ||
          !originalConnected ||
          !isOriginalConnectionActive()
        ) {
          throw new Error('Dropping databases is not supported for this connection.')
        }
        const confirmed = await this.$confirm(
          `Permanently drop ${selected.length} selected database${selected.length === 1 ? '' : 's'}? This action cannot be undone.`,
          undefined,
          { variant: 'danger' }
        )
        if (!confirmed) return

        for (let index = 0; index < selected.length; index += 1) {
          const name = selected[index]
          if (this.isBeingDestroyed) {
            skipped.push(...selected.slice(index).map(database => ({ name: database, reason: 'component was closed' })))
            break
          }
          if (!isOriginalConnectionActive()) {
            skipped.push(...selected.slice(index).map(database => ({ name: database, reason: 'connection changed' })))
            break
          }
          if (name === this.currentDatabase) {
            skipped.push({ name, reason: 'it became the current database' })
            continue
          }
          attemptedDrop = true
          try {
            await originalConnection.dropElement(name, DatabaseElement.DATABASE)
            completed.push(name)
          } catch (error) {
            failed.push({ name, message: error?.message || String(error) })
          }
        }
        closeAfterDrop = !failed.length && !skipped.length
      } catch (error) {
        failed.push({ name: 'Bulk drop', message: error?.message || String(error) })
      } finally {
        if (attemptedDrop && isOriginalConnectionActive()) {
          try {
            const refreshedDatabaseList = await originalConnection.listDatabases()
            if (isOriginalConnectionActive()) {
              this.$store.commit('databaseList', refreshedDatabaseList)
              this.databases = this.databaseRows(
                refreshedDatabaseList.filter(name => !completed.includes(name)),
                this.currentDatabase,
                this.connectionType,
                failed.map(({ name }) => name)
              )
            }
          } catch (error) {
            refreshError = error
            if (isOriginalConnectionActive()) {
              this.databases = this.databaseRows(
                this.databases.filter(database => !completed.includes(database.name)).map(database => database.name),
                this.currentDatabase,
                this.connectionType,
                failed.map(({ name }) => name)
              )
            }
          }
        }

        if (!this.isBeingDestroyed) {
          this.loading = false
          if (!isOriginalConnectionActive()) this.databases = []
        }
      }

      const report = [
        completed.length ? `Completed: ${completed.join(', ')}` : null,
        failed.length ? `Failed: ${failed.map(({ name, message }) => `${name}: ${message}`).join('; ')}` : null,
        skipped.length ? `Skipped: ${skipped.map(({ name, reason }) => `${name} (${reason})`).join(', ')}` : null,
        refreshError ? `Database list refresh failed: ${refreshError.message || refreshError}` : null
      ].filter(Boolean).join('\n')

      if (completed.length) this.$noty.success(`Dropped ${completed.length} database${completed.length === 1 ? '' : 's'}: ${completed.join(', ')}`)
      if (failed.length) this.$noty.error(`Could not drop ${failed.length} item${failed.length === 1 ? '' : 's'}`)
      if (skipped.length || refreshError) this.$noty.warning(report)
      if (!this.isBeingDestroyed) {
        this.error = failed.length || skipped.length || refreshError ? report : null
        if (closeAfterDrop && !refreshError && isOriginalConnectionActive()) this.$modal.hide('drop-databases')
      }
    }
  }
})
</script>

<style lang="scss" scoped>
.database-list {
  max-height: 50vh;
  overflow-y: auto;
}

.database-item {
  display: flex;
  align-items: center;
  line-height: 1.6;
}

.database-item small {
  color: var(--text-light);
}
</style>

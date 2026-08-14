<template>
  <base-modal
    name="drop-databases"
    :loading="loading"
    @submit="confirmDrop"
  >
    <template #title>
      <span class="text-danger">Drop Databases</span>
    </template>

    <p class="alert alert-danger" aria-role="alert">
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
          :for="`drop-db-${database.name}`"
          class="checkbox-group"
        >
          <input
            :id="`drop-db-${database.name}`"
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

    <error-alert :error="error" />

    <p class="alert alert-danger" aria-role="alert">
      This action cannot be undone.
    </p>

    <template #footer="{ close }">
      <button
        class="btn btn-flat"
        type="button"
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

export default Vue.extend({
  components: {
    BaseModal,
    ErrorAlert
  },

  data() {
    return {
      databases: [],
      currentDatabase: null,
      loading: false,
      error: null
    }
  },

  computed: {
    selectedDatabases() {
      return this.databases.filter(database => database.checked)
    },

    rootBindings() {
      return [
        {
          event: AppEvent.dropDatabases,
          handler: this.open
        }
      ]
    }
  },

  mounted() {
    this.registerHandlers(this.rootBindings)
  },

  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings)
  },

  methods: {
    open({ databases, currentDatabase }) {
      this.currentDatabase = currentDatabase

      this.databases = databases.map(database => ({
        name: database,
        checked: false
      }))

      this.error = null
      this.$modal.show('drop-databases')
    },

    async confirmDrop() {
      this.loading = true
      this.error = null

      try {
        const selected = this.selectedDatabases
          .map(database => database.name)

        this.$root.$emit(
          AppEvent.dropDatabasesConfirmed,
          selected
        )

        this.$modal.hide('drop-databases')
      } catch (error) {
        this.error = error
      } finally {
        this.loading = false
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
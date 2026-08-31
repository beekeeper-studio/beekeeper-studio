<template>
  <base-modal
    name="import-connections"
    class="import-connections-modal"
    :loading="loading"
    @submit="doImport"
  >
    <template #title>
      Import Connections
    </template>
    <p class="import-connections-subtitle">
      Importing a connection will copy it from your local workspace into your cloud workspace. Imported connections are private to you by default.
    </p>
    <error-alert :error="error" />
    <div class="connection-list">
      <div
        class="connection-item"
        v-for="connection in connections"
        :key="connection.id"
      >
        <label
          :for="`c-${connection.id}`"
          class="checkbox-group"
        >
          <input
            type="checkbox"
            v-model="connection.checked"
            class="form-control"
            :id="`c-${connection.id}`"
            :name="`c-${connection.id}`"
          >
          <span>{{ connection.name }}</span>
        </label>
      </div>
    </div>
    <template #footer="{ close }">
      <button
        class="btn btn-flat"
        type="button"
        @click.prevent="close"
      >
        Close
      </button>
      <button
        :disabled="loading"
        class="btn btn-primary"
        type="submit"
      >
        {{ loading ? '...' : 'Import' }}
      </button>
    </template>
  </base-modal>
</template>
<script lang="ts">
import { AppEvent } from '@/common/AppEvent'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import BaseModal from '@/components/common/modals/BaseModal.vue'
import Vue from 'vue'
export default Vue.extend({
  components: { ErrorAlert, BaseModal },
  data: () => ({
    connections: [],
    loading: false,
    error: null
  }),
  mounted() {
    this.registerHandlers(this.rootBindings)
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings)
  },
  computed: {
    rootBindings() {
      return [
        {
          event: AppEvent.promptConnectionImport,
          handler: this.openModal
        }
      ]
    }
  },
  methods: {
    async openModal() {
      this.connections = (await this.$util.send('appdb/saved/find')).map((c) => {
        return {
          ...c,
          checked: false
        }
      })
      this.error = null
      this.$modal.show('import-connections')
    },
    async doImport() {
      this.loading = true
      this.error = null
      const candidates = this.connections.filter((c) => c.checked)
      try {
        await Promise.all(candidates.map((c) => {
          // Clear id and connectionFolderId so the connection goes to the personal folder
          const payload = {...c, id: null, connectionFolderId: null}
          return this.$store.dispatch('data/connections/save', payload)
        }))
        this.$modal.hide('import-connections')
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
.import-connections-subtitle {
  color: var(--text-light);
  margin-bottom: 0.5rem;
}

.connection-list {
  max-height: 50vh;
  overflow-y: auto;
}

.connection-item {
  display: flex;
  align-items: center;
  line-height: 1.6;
}
</style>

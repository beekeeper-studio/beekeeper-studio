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
      <local-item-tree-picker
        :type="'connection'"
        v-model="selectedConnections"
      />
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
        class="btn btn-primary btn-badge"
        type="submit"
      >
        <span
          class="badge"
          v-if="!loading && selectedConnections.length > 0"
        >
          <small>{{ selectedConnections.length }}</small>
        </span>
        {{ loading ? '...' : 'Import' }}
      </button>
    </template>
  </base-modal>
</template>
<script lang="ts">
import Vue from 'vue'
import { AppEvent } from '@/common/AppEvent'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import BaseModal from '@/components/common/modals/BaseModal.vue'
import LocalItemTreePicker from '@/components/common/LocalItemTreePicker.vue'

export default Vue.extend({
  components: { ErrorAlert, BaseModal, LocalItemTreePicker },
  data: () => ({
    loading: false,
    error: null,
    selectedConnections: []
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
      this.selectedConnections = [];
      this.error = null
      this.$modal.show('import-connections')
    },
    async doImport() {
      this.loading = true
      this.error = null
      try {
        await Promise.all(this.selectedConnections.map(async (id: number) => {
          const conn = await this.findLocal(id);
          // Clear id and connectionFolderId so the connection goes to the personal folder
          const payload = {...conn, id: null, connectionFolderId: null}
          return this.$store.dispatch('data/connections/save', payload)
        }))
        this.$modal.hide('import-connections')
      } catch (error) {
        this.error = error
      } finally {
        this.loading = false
      }
    },
    async findLocal(id: number) {
      return await this.$util.send('appdb/connection/findOneBy', { options: { id }});
    }
  }
})
</script>
<style lang="scss" scoped>
@import '../../assets/styles/app/_variables.scss';

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

.btn-badge {
  .badge {
    margin: 0;
    margin-right: $gutter-h * 0.25;
    background: transparent;
    line-height: 1;
    padding-left: 0;
    color: rgba($theme-bg, 0.87);
  }
}
</style>

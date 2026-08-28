<template>
  <base-modal
    name="import-queries"
    class="import-queries-modal"
    :loading="loading"
    @submit="doImport"
  >
    <template #title>
      Import Queries
    </template>
    <p class="import-queries-subtitle">
      Importing a query will <strong>copy</strong> it from your local workspace into the personal folder of your team workspace.
    </p>
    <error-alert
      :error="error"
      v-if="error"
    />
    <div class="query-list">
      <local-item-tree-picker
        :type="'query'"
        v-model="selectedQueries"
      >
        <template #empty>
          <div
            class="query-item"
          >
            Import not available: You don't have any queries in your local workspace.
          </div>
        </template>
      </local-item-tree-picker>
    </div>
    <template #footer="{ close }">
      <button
        class="btn btn-flat"
        @click.prevent="close"
      >
        Close
      </button>
      <button
        :disabled="loading"
        class="btn btn-primary"
        @click.prevent="doImport"
      >
        {{ loading ? '...' : 'Import' }}
      </button>
    </template>
  </base-modal>
</template>
<script lang="ts">
import Vue from 'vue'
import { AppEvent } from '@/common/AppEvent'
import LocalItemTreePicker from '@/components/common/LocalItemTreePicker.vue'
import BaseModal from '@/components/common/modals/BaseModal.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import rawLog from '@bksLogger'

const log = rawLog.scope('ImportQueriesModal')

export default Vue.extend({
  components: { ErrorAlert, BaseModal, LocalItemTreePicker },
  mounted() {
    this.registerHandlers(this.rootBindings)
  },
  data: () => ({
    loading: false,
    error: null,
    selectedQueries: []
  }),
  computed: {
    rootBindings() {
      return [
        {
          event: AppEvent.promptQueryImport,
          handler: this.openModal
        }
      ]
    }
  },
  methods: {
    clear() {
      this.selectedQueries = [];
      this.loading = false
      this.error = null
    },
    async openModal() {
      this.clear();
      this.$modal.show('import-queries')
    },
    async doImport() {
      this.loading = true
      try {
        await Promise.all(this.selectedQueries.map(async (id: number) => {
          const query = await this.findLocal(id);

          if (!query) {
            log.error(`Could not find local query for ${id}`);
            return;
          }

          const payload = { ...query, id: null, queryFolderId: null }
          return this.$store.dispatch('data/queries/save', payload);
        }))
        this.$modal.hide('import-queries')
      } catch (error) {
        this.error = error
      } finally {
        this.loading = false
      }
    },
    async findLocal(id: number) {
      return await this.$util.send(`appdb/query/findOne`, {
        options: {
          where: {
            id
          },
          select: {
            id: true,
            text: true,
            title: true,
            database: true,
            excerpt: true,
          }
        }
      })
    }
  }
})
</script>
<style lang="scss">
.import-queries-subtitle {
  color: var(--text-light);
  margin-bottom: 0.5rem;
}

.query-list {
  max-height: 50vh;
  overflow-y: auto;
}

.query-item {
  display: flex;
  align-items: center;
  line-height: 1.6;
}
</style>

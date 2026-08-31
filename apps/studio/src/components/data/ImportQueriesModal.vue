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
      <div
        v-if="!queries || !queries.length"
        class="query-item"
      >
        Import not available: You don't have any queries in your local workspace.
      </div>
      <div
        class="query-item"
        v-for="query in queries"
        :key="query.id"
      >
        <label
          :for="`cb-${query.id}`"
          class="checkbox-group"
        >
          <input
            type="checkbox"
            class="form-control"
            :name="`cb-${query.id}`"
            :id="`cb-${query.id}`"
            v-model="query.checked"
          >
          <span>{{ query.title }}</span>
        </label>
      </div>
    </div>
    <template #footer="{ close }">
      <button
        class="btn btn-flat"
        @click.prevent="close"
      >
        Close
      </button>
      <button
        v-if="queries && queries.length"
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
import { AppEvent } from '@/common/AppEvent'
import { TransportFavoriteQuery } from '@/common/transport'
import BaseModal from '@/components/common/modals/BaseModal.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import Vue from 'vue'

export default Vue.extend({
  components: { ErrorAlert, BaseModal },
  mounted() {
    this.registerHandlers(this.rootBindings)
  },
  data: () => ({
    queries: [],
    loading: false,
    error: null
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
      this.queries = []
      this.loading = false
      this.error = null
    },
    async openModal() {
      this.queries = (await this.$util.send('appdb/query/find')).map((q: TransportFavoriteQuery) => {
        return {
          ...q,
          checked: false
        }
      })
      this.$modal.show('import-queries')
    },
    async doImport() {
      this.loading = true
      const candidates = this.queries.filter((q) => q.checked)
      try {
        await Promise.all(candidates.map((q) => {
          // Clear id and queryFolderId so the query goes to the personal folder
          const payload = {...q, id: null, queryFolderId: null}
          return this.$store.dispatch('data/queries/save', payload)
        }))
        this.$modal.hide('import-queries')
      } catch (error) {
        this.error = error
      } finally {
        this.loading = false
      }
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

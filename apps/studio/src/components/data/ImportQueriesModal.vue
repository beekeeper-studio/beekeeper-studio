<template>
  <modal
    name="import-queries"
    class="vue-dialog beekeeper-modal"
    @closed="clear"
  >
    <div class="dialog-content">
      <div class="dialog-c-title">
        Import Queries
      </div>
      <div class="dialog-c-subtitle">
        Importing a query will <strong>copy</strong> it from your local workspace into the personal folder of your team workspace.
      </div>
      <error-alert
        :error="error"
        v-if="error"
      />
      <div>
        <div class="list-group">
          <div class="list-body">
            <div
              v-if="!queries || !queries.length"
              class="list-item"
            >
              Import not available: You don't have any queries in your local workspace.
            </div>
            <div
              class="list-item"
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
        </div>
      </div>
    </div>
    <div class="vue-dialog-buttons">
      <button
        class="btn btn-flat"
        @click.prevent="$modal.hide('import-queries')"
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
    </div>
  </modal>
</template>
<script lang="ts">
import { FavoriteQuery } from '@/common/appdb/models/favorite_query'
import { AppEvent } from '@/common/AppEvent'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import Vue from 'vue'
export default Vue.extend({
  components: { ErrorAlert },
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
      this.queries = (await FavoriteQuery.find()).map((q) => {
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
          const payload = {...q, id: null}
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

<template>
  <modal
    name="import-queries"
    class="vue-dialog beekeeper-modal import-queries-modal"
    @closed="clear"
  >
    <div class="dialog-content">
      <div class="dialog-c-title">
        Import Queries
      </div>
      <div class="dialog-c-subtitle">
        Importing a query will <strong>copy</strong> it from your local workspace into the selected folder of your team workspace.
      </div>
      <error-alert
        :error="error"
        v-if="error"
      />
      <div class="form-group destination-folder">
        <label for="import-queries-folder">Destination Folder</label>
        <select
          id="import-queries-folder"
          v-model="targetFolderId"
        >
          <option :value="null">
            Personal (no folder)
          </option>
          <option
            v-for="opt in folderOptions"
            :key="opt.id"
            :value="opt.id"
          >
            {{ opt.label }}
          </option>
        </select>
      </div>
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
import { AppEvent } from '@/common/AppEvent'
import { TransportFavoriteQuery } from '@/common/transport'
import { buildFolderOptions } from '@/common/utils/folderTree'
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
    error: null,
    targetFolderId: null
  }),
  computed: {
    rootBindings() {
      return [
        {
          event: AppEvent.promptQueryImport,
          handler: this.openModal
        }
      ]
    },
    folders() {
      return this.$store.state['data/queryFolders'].items
    },
    folderOptions() {
      return buildFolderOptions(this.folders)
    }
  },
  methods: {
    clear() {
      this.queries = []
      this.loading = false
      this.error = null
      this.targetFolderId = null
    },
    async openModal(folder?: { id: number }) {
      await this.$store.dispatch('data/queryFolders/load')
      this.targetFolderId = folder?.id ?? null
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
          // Clear id so a copy is created, and assign the chosen destination folder
          const payload = {...q, id: null, queryFolderId: this.targetFolderId ?? null}
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
.import-queries-modal {
  .v--modal {
    display: flex;
    flex-direction: column;
  }
  .dialog-content {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
  }
  .vue-dialog-buttons {
    flex-shrink: 0;
  }
}
</style>

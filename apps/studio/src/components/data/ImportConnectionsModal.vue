<template>
  <modal
    name="import-connections"
    class="vue-dialog beekeeper-modal"
  >
    <div class="dialog-content">
      <div class="dialog-c-title">
        Import Connections
      </div>
      <div class="dialog-c-subtitle">
        Importing a connection will copy it from your local workspace into your cloud workspace. Imported connections are private to you by default.
      </div>
      <error-alert :error="error" />
      <div>
        <div class="list-group">
          <div class="list-body">
            <div
              class="list-item"
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
        </div>
      </div>
    </div>
    <div class="vue-dialog-buttons">
      <button
        class="btn btn-flat"
        @click.prevent="$modal.hide('import-connections')"
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
    </div>
  </modal>
</template>
<script lang="ts">
import { AppEvent } from '@/common/AppEvent'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import Vue from 'vue'
export default Vue.extend({
  components: { ErrorAlert },
  data: () => ({
    connections: [],
    loading: false,
    error: null
  }),
  mounted() {
    this.registerHandlers(this.rootBindings)
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
      console.log("opening modal!")
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
          const payload = {...c, id: null}
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

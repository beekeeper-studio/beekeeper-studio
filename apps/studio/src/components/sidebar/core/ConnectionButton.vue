<template>
  <div
    class="connection-button flex flex-middle"
    v-if="config"
    :title="$bks.buildConnectionString(config)"
  >
    <x-button
      class="btn btn-link btn-icon"
      menu
    >
      <i class="material-icons">link</i>
      <span class="connection-name truncate expand">{{ connectionName }}</span>
      <span
        class="connection-type badge truncate"
        v-tooltip="databaseVersion"
      >{{ connectionType }}</span>
      <x-menu>
        <x-menuitem
          @click.prevent="disconnect(false)"
          class="red"
        >
          <x-label><i class="material-icons">power_settings_new</i>Disconnect</x-label>
        </x-menuitem>
        <x-menuitem @click.prevent="$modal.show('config-save-modal')">
          <x-label v-if="config.id">
            <i class="material-icons">edit</i>Edit Connection
          </x-label>
          <x-label v-else>
            <i class="material-icons">save</i>Save Connection
          </x-label>
        </x-menuitem>
        <!-- FIXME: Let's not use connection.connectionType -->
        <x-menuitem
          v-if="connection.connectionType === 'libsql' && connection.server.config.libsqlOptions.syncUrl"
          @click.prevent="syncDatabase"
        >
          <x-label>
            <i class="material-icons">sync</i>Sync Database
          </x-label>
        </x-menuitem>
      </x-menu>
    </x-button>

    <portal to="modals">
      <modal
        class="vue-dialog beekeeper-modal save-connection-modal"
        name="config-save-modal"
        height="auto"
        :scrollable="true"
      >
        <div
          class="dialog-content"
          v-kbd-trap="true"
        >
          <div
            v-if="errors"
            class="alert alert-danger"
          >
            <i class="material-icons">error_outline</i>
            <div class="alert-body flex-col">
              <span>Please fix the following errors:</span>
              <ul>
                <li
                  v-for="(e, i) in errors"
                  :key="i"
                >
                  {{ e }}
                </li>
              </ul>
            </div>
          </div>
          <SaveConnectionForm
            :select-input="true"
            @cancel="$modal.hide('config-save-modal')"
            :can-cancel="true"
            :config="config"
            @save="save"
          />
        </div>
      </modal>
    </portal>
    <portal to="modals">
      <modal
        class="vue-dialog beekeeper-modal"
        name="running-exports-modal"
        height="auto"
        :scrollable="true"
        @opened="$refs.cancel.focus()"
      >
        <form
          v-kbd-trap="true"
          @submit.prevent="disconnect(true)"
        >
          <div class="dialog-content">
            <div class="dialog-c-title">
              Confirm Disconnect
            </div>
            There are active exports running. Are you sure you want to disconnect?
          </div>
          <div class="vue-dialog-buttons">
            <button
              class="btn btn-flat"
              type="button"
              ref="cancel"
              @click.prevent="$modal.hide('running-exports-modal')"
            >
              Cancel
            </button>
            <button
              class="btn btn-danger"
              type="submit"
            >
              Disconnect
            </button>
          </div>
        </form>
      </modal>
    </portal>
  </div>
</template>
<script>
import { mapState, mapGetters } from 'vuex'
import SaveConnectionForm from '../../connection/SaveConnectionForm.vue'
import rawLog from '@bksLogger'

const log = rawLog.scope('app.vue')

export default {
  components: {
    SaveConnectionForm
  },
  data() {
    return {
      errors: null
    }
  },
  computed: {
      ...mapState({'config': 'usedConfig', 'connection': 'connection', 'versionString': 'versionString'}),
      ...mapGetters({'hasRunningExports': 'exports/hasRunningExports', 'workspace': 'workspace'}),
      connectionName() {
        return this.config ? this.$bks.buildConnectionName(this.config) : 'Connection'
      },
      connectionType() {
        return `${this.config.connectionType}`
      },
      databaseVersion() {
        return this.versionString
      }
  },
  methods: {

    async save() {
      try {
        this.errors = null
        await this.$store.dispatch('saveConnection', this.config)
        await this.$store.dispatch('pins/maybeSavePins')
        await this.$store.dispatch('hideEntities/maybeSave')
        this.$modal.hide('config-save-modal')
        this.$noty.success("Connection Saved")
      } catch (error) {
        this.errors = [error.message]
      }

    },
    disconnect(force) {
      if (this.hasRunningExports && !force) {
        this.$modal.show('running-exports-modal')
      } else {
        this.$store.dispatch('disconnect')
      }
    },
    async syncDatabase() {
      try {
        await this.$store.dispatch('syncDatabase')
        this.$noty.success("Database Synced")
      } catch (error) {
        log.error(error)
        this.$noty.error(error.message)
      }
    }
  }
}
</script>

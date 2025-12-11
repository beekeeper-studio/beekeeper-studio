<template>
  <div
    class="connection-button"
    v-if="config"
    :title="privacyMode ?
      'Connection details hidden by Privacy Mode' :
      $bks.buildConnectionString(config)"
    :class="classes"
  >
    <x-button
      class="btn btn-link btn-icon"
      menu
    >
      <i class="material-icons">link</i>
      <span class="connection-name truncate expand">
        {{ connectionName }}
      </span>
      <span
        class="connection-type badge truncate"
        v-tooltip="databaseVersion"
      >{{ connectionType }}</span>
      <x-menu @close="isQuickSwitcherVisible = false">
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
        <x-menuitem @click.stop.prevent="showQuickSwitcher">
            <x-label class="flex items-center justify-between">
              <span class="flex items-center">
                <i class="material-icons">swap_horiz</i>
                Switch Connection
              </span>
              <span style="font-size: 22px;">
                {{ isQuickSwitcherVisible ? '‹' : '›' }}
              </span>
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
    <portal to="menus">
      <div
        class="quick-switcher-panel"
        ref="quickSwitcherPanel"
        v-if="isQuickSwitcherVisible"
        @click.stop
      >
        <div class="quick-switcher-header">
          {{ showingMore ? 'Saved Connections:' : 'Recent Connections:' }}
        </div>
        <div class="quick-switcher-list-wrapper">
          <div class="quick-switcher-list">
            <button
              v-for="conn in displayedConnections"
              :key="conn.id"
              :config="conn"
              :show-duplicate="false"
              class="quick-switcher-item"
              @click="selectConnection(conn)"
            >
              {{ conn.name }}
            </button>
          </div>
        </div>
        <div class="quick-switcher-footer">
          <button class="quick-switcher-item more" @click.stop="toggleMore">
            <span class="label">{{ showingMore ? 'less' : 'more' }}</span>
            <span style="font-size: 22px;">
              {{ showingMore ? '‹' : '›' }}
            </span>
          </button>
        </div>
      </div>
    </portal>
  </div>
</template>
<script>
import { mapState, mapGetters } from 'vuex'
import { isUltimateType } from '@/common/interfaces/IConnection'
import SaveConnectionForm from '../../connection/SaveConnectionForm.vue'
import rawLog from '@bksLogger'

const log = rawLog.scope('app.vue')

export default {
  components: {
    SaveConnectionForm
  },
  data() {
    return {
      errors: null,
      isQuickSwitcherVisible: false,
      showingMore: false,
      recentConnections: [],
    }
  },
  computed: {
    ...mapState({
      config: state => state.usedConfig,
      connection: state => state.connection,
      versionString: state => state.versionString
    }),
    ...mapState('settings', ['privacyMode']),
    ...mapState('data/connections', {'connectionConfigs': 'items'}),
    ...mapGetters({
      hasRunningExports: 'exports/hasRunningExports',
      workspace: 'workspace',
      connectionColor: 'connectionColor',
      savedConnections: 'data/connections/filteredConnections',
      isUltimate: 'isUltimate'
    }),
    connectionName() {
      return this.config ? this.$bks.buildConnectionName(this.config) : 'Connection'
    },
    connectionType() {
      return `${this.config.connectionType}`
    },
    databaseVersion() {
      return this.versionString
    },
    recentConnectionsConfigs() {
      return this.$store.getters['data/usedconnections/orderedUsedConfigs'] || []
    },
    displayedConnections() {
      const connections = this.showingMore ? this.savedConnections : this.recentConnections;

      return connections.filter(conn =>
        conn.id !== this.config.id || conn.workspaceId !== this.config.workspaceId
      );
    },
    classes() {
      const result = {
        'connection-button': true
      }

      result[this.connectionColor] = true
      return result;
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
    },
    showQuickSwitcher() {
      this.isQuickSwitcherVisible = !this.isQuickSwitcherVisible;
      if (this.isQuickSwitcherVisible) {
        this.populateRecentConnections();
      }
    },
    async selectConnection(config) {
      if (!this.isUltimate && isUltimateType(config?.connectionType)) {
        this.$noty.error('Cannot switch to Ultimate only connection.')
        return;
      }

      await this.$store.dispatch('disconnect')
      try {
        const { auth, cancelled } = await this.$bks.unlock();
        if (cancelled) return;
        await this.$store.dispatch('connect', { config, auth });
      } catch (ex) {
        log.error(ex)
        this.$noty.error("Error establishing a connection")
      }
      this.isQuickSwitcherVisible = false
    },
    toggleMore() {
      this.showingMore = !this.showingMore;
    },
    populateRecentConnections() {
      if (!this.config.id || !this.config.workspaceId) {
        console.log('Missing id or workspaceId:', {
          id: this.config.id,
          workspaceId: this.config.workspaceId
        });
        return
      }

      const filteredRecent = this.recentConnectionsConfigs
        .map(rc => this.connectionConfigs.find(c =>
          c.id === rc.connectionId &&
          c.workspaceId === rc.workspaceId &&
          (c.id !== this.config.id || c.workspaceId !== this.config.workspaceId)
        ))
        .filter(Boolean);
      this.recentConnections = filteredRecent.slice(0, 5)
    },
  }
}
</script>

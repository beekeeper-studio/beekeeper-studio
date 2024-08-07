<template>
  <div class="interface connection-interface">
    <div
      class="interface-wrap row"
    >
      <sidebar
        class="connection-sidebar"
        ref="sidebar"
        v-show="sidebarShown"
      >
        <connection-sidebar
          :selected-config="config"
          @remove="remove"
          @duplicate="duplicate"
          @edit="edit"
          @connect="handleConnect"
          @create="create"
        />
      </sidebar>
      <div
        ref="content"
        class="connection-main page-content flex-col"
        id="page-content"
      >
        <div class="small-wrap expand">
          <div
            class="card-flat padding"
            :class="determineLabelColor"
          >
            <div class="flex flex-between">
              <h3
                class="card-title"
                v-if="!pageTitle"
              >
                New Connection
              </h3>
              <h3
                class="card-title"
                v-if="pageTitle"
              >
                {{ pageTitle }}
              </h3>
              <ImportButton :config="config">
                Import from URL
              </ImportButton>
            </div>
            <error-alert
              :error="errors"
              title="Please fix the following errors"
            />
            <form
              @action="submit"
              v-if="config"
            >
              <div class="form-group">
                <label for="connection-select">Connection Type</label>
                <select
                  name="connectionType"
                  class="form-control custom-select"
                  v-model="config.connectionType"
                  id="connection-select"
                >
                  <option
                    disabled
                    hidden
                    value="undefined"
                  >
                    Select a connection type...
                  </option>
                  <option
                    :key="`${t.value}-${t.name}`"
                    v-for="t in connectionTypes"
                    :value="t.value"
                  >
                    {{ t.name }}
                  </option>
                </select>
              </div>
              <div v-if="config.connectionType">
                <!-- INDIVIDUAL DB CONFIGS -->
                <upsell-content v-if="shouldUpsell" />
                <postgres-form
                  v-else-if="config.connectionType === 'cockroachdb'"
                  :config="config"
                  :testing="testing"
                />
                <mysql-form
                  v-else-if="['mysql', 'mariadb', 'tidb'].includes(config.connectionType)"
                  :config="config"
                  :testing="testing"
                  @save="save"
                  @test="testConnection"
                  @connect="submit"
                />
                <postgres-form
                  v-else-if="config.connectionType === 'postgresql'"
                  :config="config"
                  :testing="testing"
                />
                <redshift-form
                  v-else-if="config.connectionType === 'redshift'"
                  :config="config"
                  :testing="testing"
                />
                <sqlite-form
                  v-else-if="config.connectionType === 'sqlite'"
                  :config="config"
                  :testing="testing"
                />
                <sql-server-form
                  v-else-if="config.connectionType === 'sqlserver'"
                  :config="config"
                  :testing="testing"
                />
                <big-query-form
                  v-else-if="config.connectionType === 'bigquery'"
                  :config="config"
                  :testing="testing"
                />
                <firebird-form
                  v-else-if="config.connectionType === 'firebird'"
                  :config="config"
                  :testing="testing"
                />
                <lib-sql-form
                  v-else-if="config.connectionType === 'libsql'"
                  :config="config"
                  :testing="testing"
                />


                <!-- TEST AND CONNECT -->
                <div
                  v-if="!shouldUpsell"
                  class="test-connect row flex-middle"
                >
                  <span class="expand" />
                  <div class="btn-group">
                    <button
                      :disabled="testing"
                      class="btn btn-flat"
                      type="button"
                      @click.prevent="testConnection"
                    >
                      Test
                    </button>
                    <button
                      :disabled="testing"
                      class="btn btn-primary"
                      type="submit"
                      @click.prevent="submit"
                    >
                      Connect
                    </button>
                  </div>
                </div>
                <div
                  class="row"
                  v-if="connectionError"
                >
                  <div class="col">
                    <error-alert
                      :error="connectionError"
                      :help-text="errorHelp"
                      @close="connectionError = null"
                      :closable="true"
                    />
                  </div>
                </div>
                <SaveConnectionForm
                  v-if="!shouldUpsell"
                  :config="config"
                  @save="save"
                />
              </div>
            </form>
          </div>
          <div
            class="pitch"
            v-if="!config.connectionType && shouldUpsell"
          >
            🌟 <strong>Upgrade to premium</strong> for data import, multi-table export, backup & restore, Oracle support, and more.
            <a
              href="https://docs.beekeeperstudio.io/docs/upgrading-from-the-community-edition"
              class=""
            >Upgrade Now</a>.
          </div>
        </div>

        <small class="app-version"><a href="https://www.beekeeperstudio.io/releases/latest">Beekeeper Studio {{ version
        }}</a></small>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import ConnectionSidebar from './sidebar/ConnectionSidebar.vue'
import MysqlForm from './connection/MysqlForm.vue'
import PostgresForm from './connection/PostgresForm.vue'
import RedshiftForm from './connection/RedshiftForm.vue'
import Sidebar from './common/Sidebar.vue'
import SqliteForm from './connection/SqliteForm.vue'
import SqlServerForm from './connection/SqlServerForm.vue'
import SaveConnectionForm from './connection/SaveConnectionForm.vue'
import BigQueryForm from './connection/BigQueryForm.vue'
import FirebirdForm from './connection/FirebirdForm.vue'
import LibSQLForm from './connection/LibSQLForm.vue'
import Split from 'split.js'
import ImportButton from './connection/ImportButton.vue'
import _ from 'lodash'
import ErrorAlert from './common/ErrorAlert.vue'
import rawLog from 'electron-log'
import { mapState } from 'vuex'
import { dialectFor } from '@shared/lib/dialects/models'
import { findClient } from '@/lib/db/clients'
import UpsellContent from './connection/UpsellContent.vue'
import Vue from 'vue'
import { AppEvent } from '@/common/AppEvent'
import { isUltimateType } from '@/common/interfaces/IConnection'
import { SmartLocalStorage } from '@/common/LocalStorage'

const log = rawLog.scope('ConnectionInterface')
// import ImportUrlForm from './connection/ImportUrlForm';

export default Vue.extend({
  components: { ConnectionSidebar, MysqlForm, PostgresForm, RedshiftForm, Sidebar, SqliteForm, SqlServerForm, SaveConnectionForm, ImportButton, ErrorAlert, UpsellContent, BigQueryForm, FirebirdForm, LibSqlForm: LibSQLForm },

  data() {
    return {
      config: {} as any,
      errors: null,
      connectionError: null,
      errorHelp: null,
      testing: false,
      split: null,
      url: null,
      importError: null,
      sidebarShown: true,
      version: window.main.platformInfo.appVersion
    }
  },
  computed: {
    ...mapState(['workspaceId']),
    ...mapState('data/connections', { 'connections': 'items' }),
    connectionTypes() {
      return this.$config.defaults.connectionTypes
    },
    shouldUpsell() {
      if (window.main.platformInfo.isUltimate) return false
      return isUltimateType(this.config.connectionType)
    },
    pageTitle() {
      if (_.isNull(this.config) || _.isUndefined(this.config.id)) {
        return "New Connection"
      } else {
        return this.config.name
      }
    },
    dialect() {
      return dialectFor(this.config.connectionType)
    },
    determineLabelColor() {
      return this.config.labelColor == "default" ? '' : `connection-label-color-${this.config.labelColor}`
    },
    rootBindings() {
      return [
        { event: AppEvent.dropzoneDrop, handler: this.maybeLoadSqlite },
      ]
    },
  },
  watch: {
    workspaceId() {
      this.$util.send('appdb/saved/new').then((conn) => {
        this.config = conn;
      })
    },
    config: {
      deep: true,
      handler() {
        this.connectionError = null
      }
    },
    'config.connectionType'(newConnectionType) {
      if (!findClient(newConnectionType)?.supportsSocketPath) {
        this.config.socketPathEnabled = false
      }
    },
    connectionError() {
      console.log("error watch", this.connectionError, this.dialect)
      if (this.connectionError &&
        this.dialect == 'sqlserver' &&
        this.connectionError.message &&
        this.connectionError.message.includes('self signed certificate')
      ) {
        this.errorHelp = `You might need to check 'Trust Server Certificate'`
      } else {
        this.errorHelp = null
      }
    }
  },
  async mounted() {
    await this.$util.send('appdb/tabs/doSomethingBackend')
    if (!this.$store.getters.workspace) {
      await this.$store.commit('workspace', this.$store.state.localWorkspace)
    }
    this.$util.send('appdb/saved/new').then((conn) => {
      this.config = conn;
    })
    await this.$store.dispatch('pinnedConnections/loadPins')
    await this.$store.dispatch('pinnedConnections/reorder')
    this.config.sshUsername = await window.main.fetchUsername()
    this.$nextTick(() => {
      const components = [
        this.$refs.sidebar.$refs.sidebar,
        this.$refs.content
      ]
      const lastSavedSplitSizes = SmartLocalStorage.getItem("interfaceSplitSizes")
      const splitSizes = lastSavedSplitSizes ? JSON.parse(lastSavedSplitSizes) : [25, 75]

      this.split = Split(components, {
        elementStyle: (_dimension, size) => ({
          'flex-basis': `calc(${size}%)`,
        }),
        sizes: splitSizes,
        gutterize: 8,
        minSize: [25, 75],
        expandToMin: true,
        onDragEnd: () => {
          const splitSizes = this.split.getSizes()
          SmartLocalStorage.addItem("interfaceSplitSizes", splitSizes)
        }
      } as Split.Options)
    })
    this.registerHandlers(this.rootBindings)
  },
  beforeDestroy() {
    if (this.split) {
      this.split.destroy()
    }
    this.unregisterHandlers(this.rootBindings)
  },
  methods: {
    maybeLoadSqlite({ files }) {
      // cast to an array
      if (!files || !files.length) return
      if (!this.config) return;
      // we only load the first
      const file = files[0]
      const allGood = this.config.parse(file.path)
      if (!allGood) {
        this.$noty.error(`Unable to open '${file.name}'. It is not a valid SQLite file.`);
        return
      } else {
        this.submit()
      }

    },
    create() {
      this.$util.send('appdb/saved/new').then((conn) => {
        this.config = conn;
      })
    },
    edit(config) {
      this.config = _.clone(config)
      this.errors = null
      this.connectionError = null
    },
    async remove(config) {
      if (this.config === config) {
        this.$util.send('appdb/saved/new').then((conn) => {
          this.config = conn;
        })
      }
      if (config.azureAuthOptions?.authId) {
        await this.$util.send('appdb/cache/remove', { authId: config.azureAuthOptions.authId });
      }
      await this.$store.dispatch('pinnedConnections/remove', config)
      await this.$store.dispatch('data/connections/remove', config)
      this.$noty.success(`${config.name} deleted`)
    },
    async duplicate(config) {
      // Duplicates ES 6 class of the connection, without any reference to the old one.
      const duplicateConfig = await this.$store.dispatch('data/connections/clone', config)
      duplicateConfig.name = 'Copy of ' + duplicateConfig.name

      try {
        const id = await this.$store.dispatch('data/connections/save', duplicateConfig)
        this.$noty.success(`The connection was successfully duplicated!`)
        this.config = this.connections.find((c) => c.id === id) || this.config
      } catch (ex) {
        this.$noty.error(`Could not duplicate Connection: ${ex.message}`)
      }

    },
    async submit() {
      if (!window.main.platformInfo.isUltimate && isUltimateType(this.config.connectionType)) {
        return
      }

      this.connectionError = null
      try {
        await this.$store.dispatch('connect', this.config)
      } catch (ex) {
        this.connectionError = ex
        this.$noty.error("Error establishing a connection")
        log.error(ex)
      }
    },
    async handleConnect(config) {
      this.config = config
      await this.submit()
    },
    async testConnection() {
      if (!window.main.platformInfo.isUltimate && isUltimateType(this.config.connectionType)) {
        return
      }

      try {
        this.testing = true
        this.connectionError = null
        await this.$store.dispatch('test', this.config)
        this.$noty.success("Connection looks good!")
        return true
      } catch (ex) {
        this.connectionError = ex
        this.$noty.error("Error establishing a connection")
      } finally {
        this.testing = false
      }
    },
    async save() {
      try {
        this.errors = null
        this.connectionError = null
        if (!this.config.name) {
          throw new Error("Name is required")
        }
        // create token cache for azure auth
        if (this.config.azureAuthOptions.azureAuthEnabled && !this.config.authId) {
          const cacheId = await this.$util.send('appdb/cache/new');
          this.config.authId = cacheId;
        }

        await this.$store.dispatch('data/connections/save', this.config)
        this.$noty.success("Connection Saved")
      } catch (ex) {
        console.error(ex)
        this.errors = [ex.message]
        this.$noty.error("Could not save connection information")
      }
    },
    handleErrorMessage(message) {
      if (message) {
        this.errors = [message]
        this.$noty.error("Could not parse connection URL.")
      } else {
        this.errors = null
      }
    }
  },
})
</script>

<style></style>

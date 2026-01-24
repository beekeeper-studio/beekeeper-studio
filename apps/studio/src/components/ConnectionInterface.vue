<template>
  <div class="interface connection-interface">
    <div class="interface-wrap row">
      <sidebar class="connection-sidebar" ref="sidebar" v-show="sidebarShown">
        <connection-sidebar
          :selected-config="config"
          @remove="remove"
          @duplicate="duplicate"
          @edit="edit"
          @connect="handleConnect"
          @create="create"
        />
      </sidebar>
      <div ref="content" class="connection-main page-content flex-col" id="page-content">
        <div class="small-wrap expand">
          <div class="card-flat padding" v-if="!isConfigReady">
            <content-placeholder-heading />
          </div>
          <div class="card-flat padding" :class="determineLabelColor" v-else>
            <div class="flex flex-between">
              <h3 class="card-title" v-if="!pageTitle">
                New Connection
              </h3>
              <h3 class="card-title" v-if="pageTitle">
                {{ pageTitle }}
              </h3>
              <ImportButton :config="config">
                Import from URL
              </ImportButton>
            </div>
            <error-alert :error="errors" title="Please fix the following errors" />
            <form @action="submit" v-if="config">
              <div class="form-group">
                <label for="connection-select">Connection Type</label>
                <select
                  name="connectionType"
                  class="form-control custom-select"
                  v-model="config.connectionType"
                  id="connection-select"
                >
                  <option disabled hidden value="null">
                    Select a connection type...
                  </option>
                  <option :key="`${t.value}-${t.name}`" v-for="t in communityConnectionTypes" :value="t.value">
                    {{ t.name }}
                  </option>
                  <option :key="`${t.value}-${t.name}`" :value="t.value" v-for="t in ultimateConnectionTypes">
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
                  @error="connectionError = $event" />
                <big-query-form
                  v-else-if="config.connectionType === 'bigquery'"
                  :config="config"
                  :testing="testing"
                />
                <firebird-form
                  v-else-if="config.connectionType === 'firebird' && isUltimate"
                  :config="config"
                  :testing="testing"
                />
                <oracle-form
                  v-if="config.connectionType === 'oracle' && isUltimate"
                  :config="config"
                  :testing="testing"
                />
                <cassandra-form
                  v-if="config.connectionType === 'cassandra' && isUltimate"
                  :config="config"
                  :testing="testing"
                />
                <click-house-form
                  v-else-if="config.connectionType === 'clickhouse' && isUltimate"
                  :config="config"
                  :testing="testing"
                />
                <trino-form
                  v-else-if="config.connectionType === 'trino' && isUltimate"
                  :config="config"
                  :testing="testing"
                />
                <lib-sql-form
                  v-else-if="config.connectionType === 'libsql' && isUltimate"
                  :config="config"
                  :testing="testing"
                />
                <mongo-db-form
                  v-else-if="config.connectionType === 'mongodb' && isUltimate"
                  :config="config"
                  :testing="testing"
                />
                <duck-db-form
                  v-else-if="config.connectionType === 'duckdb'"
                  :config="config"
                  :testing="testing"
                />
                <sql-anywhere-form
                  v-else-if="config.connectionType === 'sqlanywhere' && isUltimate"
                  :config="config"
                  :testing="testing"
                />
                <surreal-db-form
                  v-else-if="config.connectionType === 'surrealdb' && isUltimate"
                  :config="config"
                  :testing="testing"
                />
                <redis-form
                  v-else-if="config.connectionType === 'redis'"
                  :config="config"
                  :testing="testing"
                />

                <!-- Set the database up in read only mode (or not, your choice) -->
                <div class="form-group" v-if="!shouldUpsell">
                  <label class="checkbox-group" for="readOnlyMode">
                    <input
                      :disabled="!isUltimate"
                      class="form-control"
                      id="readOnlyMode"
                      type="checkbox"
                      name="readOnlyMode"
                      v-model="config.readOnlyMode"
                    >
                    <span>Read Only Mode</span>
                    <i v-if="!isUltimate" v-tooltip="'Upgrade to use Read Only Mode'" class="material-icons">stars</i>
                    <!-- <i class="material-icons" v-tooltip="'Limited to '">help_outlined</i> -->
                  </label>
                </div>
                <!-- TEST AND CONNECT -->
                <div v-if="!shouldUpsell" class="test-connect row flex-middle">
                  <span class="expand" />
                  <div class="btn-group">
                    <button
                      :disabled="testing || connecting"
                      class="btn btn-flat"
                      type="button"
                      @click.prevent="testConnection"
                    >
                      Test
                    </button>
                    <button
                      :disabled="testing || connecting"
                      class="btn btn-primary"
                      type="submit"
                      @click.prevent="submit"
                    >
                      Connect
                    </button>
                  </div>
                </div>
                <div class="row" v-if="connectionError">
                  <div class="col">
                    <error-alert
                      :error="connectionError"
                      :help-text="errorHelp"
                      :link="errorLink"
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
          <template v-if="!config.connectionType">
            <div class="pitch" v-if="!isUltimate">
              🌟 <strong>Upgrade</strong> to access the JSON sidebar, AI shell, robust import/export and much more!
              <a href="https://beekeeperstudio.io/pricing" class="">Upgrade</a>.
            </div>
            <div class="pitch" v-else-if="isTrial">
              🌟 <strong>Trial expires {{ $bks.timeAgo(trialLicense.validUntil) }}</strong> Upgrade now to make sure you
              don't lose access.
              <a href="https://beekeeperstudio.io/pricing" class="">Upgrade</a>.
            </div>
            <div class="pitch" v-else>
              🌟 <strong>AI Shell</strong> - Let an LLM explore your database and write SQL for you. Bring your own API key. Simply open a new tab to get started.
              <a href="https://www.beekeeperstudio.io/features/sql-ai">Learn more</a>
            </div>
          </template>
        </div>

        <small class="app-version">
          <a href="https://www.beekeeperstudio.io/releases/latest">Beekeeper Studio {{ version }}</a>
        </small>
      </div>
    </div>
    <loading-sso-modal v-model="loadingSSOModalOpened" @cancel="loadingSSOCanceled" />
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
import ClickHouseForm from './connection/ClickHouseForm.vue'
import LibSQLForm from './connection/LibSQLForm.vue'
import CassandraForm from './connection/CassandraForm.vue'
import OracleForm from './connection/OracleForm.vue'
import MongoDbForm from './connection/MongoDBForm.vue'
import DuckDbForm from './connection/DuckDBForm.vue'
import SqlAnywhereForm from './connection/SqlAnywhereForm.vue'
import TrinoForm from './connection/TrinoForm.vue'
import SurrealDbForm from './connection/SurrealDBForm.vue'
import RedisForm from './connection/RedisForm.vue'
import Split from 'split.js'
import ImportButton from './connection/ImportButton.vue'
import LoadingSSOModal from '@/components/common/modals/LoadingSSOModal.vue'
import _ from 'lodash'
import ErrorAlert from './common/ErrorAlert.vue'
import rawLog from '@bksLogger'
import { mapGetters, mapState } from 'vuex'
import { dialectFor } from '@shared/lib/dialects/models'
import { findClient } from '@/lib/db/clients'
import { AzureAuthType } from '@/lib/db/types'
import UpsellContent from '@/components/upsell/UpsellContent.vue'
import Vue from 'vue'
import { AppEvent } from '@/common/AppEvent'
import { isUltimateType } from '@/common/interfaces/IConnection'
import { SmartLocalStorage } from '@/common/LocalStorage'
import ContentPlaceholderHeading from '@/components/common/loading/ContentPlaceholderHeading.vue'
import { FriendlyErrorHelper } from '@/frontend/utils/FriendlyErrorHelper'

const log = rawLog.scope('ConnectionInterface')
// import ImportUrlForm from './connection/ImportUrlForm';

export default Vue.extend({
  components: { ConnectionSidebar, MysqlForm, PostgresForm, RedshiftForm, CassandraForm, Sidebar, SqliteForm, SqlServerForm, SaveConnectionForm, ImportButton, ErrorAlert, OracleForm, BigQueryForm, FirebirdForm, UpsellContent, LibSqlForm: LibSQLForm, LoadingSsoModal: LoadingSSOModal, ClickHouseForm, TrinoForm, MongoDbForm, DuckDbForm, SqlAnywhereForm, RedisForm,
    ContentPlaceholderHeading, SurrealDbForm
  },

  data() {
    return {
      config: {} as any,
      errors: null,
      connectionError: null,
      errorHelp: null,
      errorLink: null,
      testing: false,
      connecting: false,
      split: null,
      url: null,
      importError: null,
      sidebarShown: true,
      loadingSSOModalOpened: false,
      version: this.$config.appVersion,
      isConfigReady: false,
    }
  },
  computed: {
    ...mapState(['workspaceId', 'connection']),
    ...mapState(['username']),
    ...mapState('data/connections', { 'connections': 'items' }),
    ...mapGetters(['isUltimate']),
    ...mapGetters('licenses', ['isTrial', 'trialLicense']),
    ...mapGetters({
      'usedConfigs': 'data/usedconnections/orderedUsedConfigs',
    }),
    communityConnectionTypes() {
      return this.$config.defaults.connectionTypes.filter((ct) => !isUltimateType(ct.value))
    },
    ultimateConnectionTypes() {
      return this.$config.defaults.connectionTypes.filter((ct) => isUltimateType(ct.value)).map((ct) => ({ ...ct, name: `${ct.name}*`}))
    },
    connectionTypes() {
      return this.$config.defaults.connectionTypes
    },
    friendlyConnectionType() {
      return this.$config.defaults.connectionTypes.find((ct) => ct.value === this.config?.connectionType)?.name ?? "Premium"
    },
    shouldUpsell() {
      if (this.isUltimate) return false
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
      if (newConnectionType == null) return
      this.$util.send('appdb/saved/new', { init: { connectionType: newConnectionType }}).then((conn) => {
        // only replace it if it's a blank, unused connection
        if (!this.config.id && !this.config.password && !this.config.username) {
          this.config = conn;
        }
        if (!findClient(newConnectionType)?.supportsSocketPath) {
          this.config.socketPathEnabled = false
        }
      })
    },
    connectionError() {

      if (this.connectionError) {
        const friendlyHelp = FriendlyErrorHelper.getHelpText(this.config.connectionType, this.connectionError)
        this.errorHelp = friendlyHelp?.help
        this.errorLink = friendlyHelp?.link
      } else {
        this.errorHelp = null
        this.errorLink = null
      }
    }
  },
  async mounted() {
    this.registerHandlers(this.rootBindings)
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

    try {
      if (!this.$store.getters.workspace) {
        await this.$store.commit('workspace', this.$store.state.localWorkspace)
      }
      const conn = await this.$util.send('appdb/saved/new')
      conn.sshUsername = this.username
      this.config = conn;
    } catch (e) {
      log.error(e)
      this.$noty.error(e.message)
    } finally {
      this.isConfigReady = true;
    }

    await this.$store.dispatch('pinnedConnections/loadPins')
    await this.$store.dispatch('pinnedConnections/reorder')
    await this.$store.dispatch('credentials/load')
  },
  beforeDestroy() {
    if (this.split) {
      this.split.destroy()
    }
    this.unregisterHandlers(this.rootBindings)
  },
  methods: {
    async maybeLoadSqlite({ files }) {
      // cast to an array
      if (!files || !files.length) return
      if (!this.config) return;
      // we only load the first
      const file = files[0]
      try {
        const conf = await this.$util.send('appdb/saved/parseUrl', { url: file.path });
        this.config = conf;
        this.submit();
      } catch {
        this.$noty.error(`Unable to open '${file.name}'. It is not a valid SQLite file.`);
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
      if (!this.isUltimate && isUltimateType(this.config.connectionType)) {
        return
      }

      this.beforeConnect()
      this.connectionError = null
      try {
        this.connecting = true
        // If this is an existing used connection that doesn't have an associated saved connection
        // we need to see if changes have been made to the config
        if (this.config.connectionId === null && this.config.id) {
          const oldConfig = this.usedConfigs.find((c) => c.id === this.config.id);
          if (!_.isEqual(this.config, oldConfig)) {
            this.config.id = null;
          }
        }

        const { auth, cancelled } = await this.$bks.unlock();
        if (cancelled) return;
        await this.$store.dispatch('connect', { config: this.config, auth })
      } catch (ex) {
        console.log("CONNECTION ERROR", ex)
        this.connectionError = ex
        this.$noty.error("Error establishing a connection")
        log.error(ex)
      } finally {
        this.connecting = false
        this.afterConnect()
      }
    },
    async handleConnect(config) {
      this.config = config
      await this.submit()
    },
    async testConnection() {
      if (!this.isUltimate && isUltimateType(this.config.connectionType)) {
        return
      }

      this.beforeConnect()

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
        this.afterConnect()
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
        if (this.config.azureAuthOptions?.azureAuthEnabled && !this.config.authId) {
          const cacheId = await this.$util.send('appdb/cache/new');
          this.config.authId = cacheId;
        }

        const id = await this.$store.dispatch('data/connections/save', this.config)

        // This feels wrong but it works. It's undefined on savedConnections
        if (this.config.connectionId === null) {
          this.config.connectionId = id;
          await this.$store.dispatch('data/usedconnections/save', this.config);
        }

        this.$noty.success("Connection Saved")
        // we want to fetch the saved one in case it's changed
        const connection = this.connections.find((c) => c.id === id)
        this.edit(connection)
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
    },
    // Before running connect/test method
    beforeConnect() {
      if (
        this.config.connectionType === 'sqlserver' &&
        this.config.azureAuthOptions.azureAuthEnabled &&
        this.config.azureAuthOptions.azureAuthType === AzureAuthType.AccessToken
      ) {
        this.loadingSSOModalOpened = true
      }
    },
    // After running connect/test method, success or fail
    afterConnect() {
      this.loadingSSOModalOpened = false
    },
    loadingSSOCanceled() {
      this.connection.azureCancelAuth();
    },
  },
})
</script>

<style></style>

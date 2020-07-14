<template>
  <div class="interface connection-interface">
    <div class="interface-wrap row">
      <sidebar class="connection-sidebar" ref="sidebar">
        <connection-sidebar :defaultConfig="defaultConfig" :selectedConfig="config" @remove="remove" @edit="edit" @connect="handleConnect"></connection-sidebar>
      </sidebar>
      <div ref="content" class="connection-main page-content" id="page-content">
        <div class="small-wrap">
          <div class="card-flat padding">
            <div class="flex flex-between">
              <h3 class="card-title">{{pageTitle}}</h3>
            </div>
            <div class="alert alert-danger" v-show="errors">
              <i class="material-icons">warning</i>
              <div>
                <span>Please fix the following errors:</span>
                <ul>
                  <li v-for="(e, i) in errors" :key="i">{{e}}</li>
                </ul>
              </div>
            </div>
            <form @action="submit" v-if="config">
              <div class="form-group">
                <label for="connectionType">Connection Type</label>
                <select name="connectionType" class="form-control custom-select" v-model="config.connectionType" id="connection-select">
                  <option disabled value="null">Select a connection type...</option>
                  <option :key="t.value" v-for="t in connectionTypes" :value="t.value">{{t.name}}</option>
                </select>
              </div>
              <div v-if="config.connectionType">
                <!-- INDIVIDUAL DB CONFIGS -->
                <postgres-form v-if="config.connectionType === 'cockroachdb'" :config="config" :testing="testing"></postgres-form>
                <mysql-form v-if="['mysql', 'mariadb'].includes(config.connectionType)" :config="config" :testing="testing" @save="save" @test="testConnection" @connect="submit"></mysql-form>
                <postgres-form v-if="config.connectionType === 'postgresql'" :config="config" :testing="testing"></postgres-form>
                <postgres-form v-if="config.connectionType === 'redshift'" :config="config" :testing="testing"></postgres-form>
                <sqlite-form v-if="config.connectionType === 'sqlite'" :config="config" :testing="testing"></sqlite-form>
                <sql-server-form v-if="config.connectionType === 'sqlserver'" :config="config" :testing="testing"></sql-server-form>

                <!-- TEST AND CONNECT -->
                <div class="row flex-middle">
                  <span class="expand"></span>
                  <div class="btn-group">
                    <button :disabled="testing" class="btn btn-flat" @click.prevent="testConnection">Test</button>
                    <button :disabled="testing" class="btn btn-primary" @click.prevent="submit">Connect</button>
                  </div>
                </div>
                <SaveConnectionForm :config="config" @save="save"></SaveConnectionForm>
              </div>

            </form>

          </div>
          <div v-if="connectionError" class="alert alert-danger">
            {{connectionError}}
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import os from 'os'
  import {SavedConnection} from '../common/appdb/models/saved_connection'
  import ConnectionSidebar from './sidebar/ConnectionSidebar'
  import MysqlForm from './connection/MysqlForm'
  import PostgresForm from './connection/PostgresForm'
  import Sidebar from './common/Sidebar'
  import SqliteForm from './connection/SqliteForm'
  import SqlServerForm from './connection/SqlServerForm'
  import SaveConnectionForm from './connection/SaveConnectionForm'
  import Split from 'split.js'
  import _ from 'lodash'
  // import ImportUrlForm from './connection/ImportUrlForm';

  export default {
    components: { ConnectionSidebar, MysqlForm, PostgresForm, Sidebar, SqliteForm, SqlServerForm, SaveConnectionForm },

    data() {
      return {
        defaultConfig: new SavedConnection(),
        config: null,
        errors: null,
        connectionError: null,
        testing: false,
        split: null
      }
    },
    computed: {
      connectionTypes() {
        return this.$config.defaults.connectionTypes
      },
      pageTitle() {
        if(_.isNull(this.config) || _.isUndefined(this.config.id)) {
          return "Quick Connect"
        } else {
          return this.config.name
        }
      }
    },
    async mounted() {
      this.config = this.defaultConfig
      this.config.sshUsername = os.userInfo().username
      await this.$store.dispatch('loadSavedConfigs')
      await this.$store.dispatch('loadUsedConfigs')
      await this.$store.dispatch('fetchUsername')
      this.$nextTick(() => {
        const components = [
          this.$refs.sidebar.$refs.sidebar,
          this.$refs.content
        ]
        this.split = Split(components, {
          elementStyle: (dimension, size) => ({
              'flex-basis': `calc(${size}%)`,
          }),
          sizes: [25,75],
          gutterize: 8,
        })
      })
    },
    beforeDestroy() {
      if(this.split) {
        this.split.destroy()
      }
    },
    methods: {
      edit(config) {
        this.config = config
      },
      async remove(config) {
        await this.$store.dispatch('removeConnectionConfig', config)
        if (this.config === config) {
          this.config = this.defaultConfig
        }
        this.$noty.success(`${config.name} deleted`)
      },
      async submit() {
        this.connectionError = null
        try {
          await this.$store.dispatch('connect', this.config)
        } catch(ex) {
          this.connectionError = ex.message
          this.$noty.error("Error establishing a connection")
        }
      },
      async handleConnect(config) {
        this.config = config
        await this.submit()
      },
      async testConnection(){

        try {
          this.testing = true
          this.connectionError = null
          await this.$store.dispatch('test', this.config)
          this.$noty.success("Connection looks good!")
          return true
        } catch(ex) {
          this.connectionError = ex.message
          this.$noty.error("Error establishing a connection")
        } finally {
          this.testing = false
        }
      },
      clearForm(){

      },
      async save() {
        try {
          this.errors = null
          this.connectionError = null
          await this.$store.dispatch('saveConnectionConfig', this.config)
          if(this.config === this.defaultConfig) {
            this.defaultConfig = new SavedConnection()
          }
          this.$noty.success("Connection Saved")
        } catch (ex) {
          this.errors = [ex.message]
          this.$noty.error("Could not save connection information")
        }
      },
      handleErrorMessage(message){
        if (message){
          this.errors = [message]
          this.$noty.error("Could not parse connection URL.")
        }else{
          this.errors = null
        }
      }
    },
  }
</script>

<template>
  <div class="interface connection-interface">
    <div class="interface-wrap row">
      <sidebar class="connection-sidebar" ref="sidebar" v-show="sidebarShown">
        <connection-sidebar :defaultConfig="defaultConfig" :selectedConfig="config" @remove="remove" @duplicate="duplicate" @edit="edit" @connect="handleConnect"></connection-sidebar>
      </sidebar>
      <div ref="content" class="connection-main page-content flex-col" id="page-content">
        <div class="small-wrap expand">
          <div class="card-flat padding">
            <div class="flex flex-between">
              <h3 class="card-title">{{pageTitle}}</h3>
              <ImportButton :config="config">Import from URL</ImportButton>
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
                <div class="test-connect row flex-middle">
                  <span class="expand"></span>
                  <div class="btn-group">
                    <button :disabled="testing" class="btn btn-flat" type="button" @click.prevent="testConnection">Test</button>
                    <button :disabled="testing" class="btn btn-primary" type="submit" @click.prevent="submit">Connect</button>
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
        <small class="app-version"><a href="https://www.beekeeperstudio.io/releases/latest">Beekeeper Studio {{version}}</a></small>
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
  import ImportButton from './connection/ImportButton'
  import _ from 'lodash'
  import platformInfo from '@/common/platform_info'
  // import ImportUrlForm from './connection/ImportUrlForm';

  export default {
    components: { ConnectionSidebar, MysqlForm, PostgresForm, Sidebar, SqliteForm, SqlServerForm, SaveConnectionForm, ImportButton },

    data() {
      return {
        defaultConfig: new SavedConnection(),
        config: null,
        errors: null,
        connectionError: null,
        testing: false,
        split: null,
        url: null,
        importError: null,
        sidebarShown: true,
        version: platformInfo.appVersion
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
    watch: {
      config: {
        deep: true,
        handler() {
          this.connectionError = null
        }
      }
    },
    async mounted() {
      this.config = this.defaultConfig
      this.config.sshUsername = os.userInfo().username
      this.$nextTick(() => {
        const components = [
          this.$refs.sidebar.$refs.sidebar,
          this.$refs.content
        ]
        this.split = Split(components, {
          elementStyle: (dimension, size) => ({
              'flex-basis': `calc(${size}%)`,
          }),
          sizes: [300,500],
          gutterize: 8,
          minSize: [300, 300],
          expandToMin: true,
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
      async duplicate(config) {
        // Duplicates ES 6 class of the connection, without any reference to the old one.
        const duplicateConfig = Object.assign( Object.create( Object.getPrototypeOf(config)), config);
        duplicateConfig.id = null
        duplicateConfig.name = 'Copy of ' + duplicateConfig.name

        try {
          await this.$store.dispatch('saveConnectionConfig', duplicateConfig)
          this.$noty.success(`The connection was successfully duplicated!`)
        } catch (ex) {
          this.$noty.error(`Could not duplicate Connection: ${ex.message}`)
        }

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

<style>
</style>

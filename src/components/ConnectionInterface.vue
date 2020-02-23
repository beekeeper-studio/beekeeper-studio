<template>
  <div class="interface connection-interface">
    <div class="interface-wrap row">
      <div ref="sidebar" class="sidebar flex-col connection-sidebar" id="sidebar">
        <connection-sidebar :defaultConfig="defaultConfig" :selectedConfig="config" @edit="edit" @connect="submit"></connection-sidebar>
      </div>
      <div ref="content" class="connection-main page-content layout-center" id="page-content">
        <div class="small-wrap">
          <div class="card-flat padding">
            <h3 class="card-title">{{pageTitle}}</h3>
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
                <select name="connectionType" class="form-control custom-select" v-model="config.connectionType" @change="changeType" id="connection-select">
                  <option disabled value="null">Select a connection type...</option>
                  <option :key="t.value" v-for="t in connectionTypes" :value="t.value">{{t.name}}</option>
                </select>
              </div>
              <mysql-form v-if="config.connectionType === 'mysql'" :config="config" :testing="testing" @save="save" @test="testConnection" @connect="submit"></mysql-form>
              <postgres-form v-if="config.connectionType === 'postgresql'" :config="config" :testing="testing"></postgres-form>
              <redshift-form v-if="config.connectionType === 'redshift'" :config="config" :testing="testing"></redshift-form>
              <sqlite-form v-if="config.connectionType === 'sqlite'" :config="config" :testing="testing"></sqlite-form>
              <sql-server-form v-if="config.connectionType === 'sqlserver'" :config="config" :testing="testing"></sql-server-form>
 
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

  import config from '../config'
  import {SavedConnection} from '../entity/saved_connection'
  import ConnectionSidebar from './ConnectionSidebar'
  import MysqlForm from './connection/MysqlForm'
  import PostgresForm from './connection/PostgresForm'
  import RedshiftForm from './connection/RedshiftForm'
  import SqliteForm from './connection/SqliteForm'
  import SqlServerForm from './connection/SqlServerForm'
  import Split from 'split.js'
  import _ from 'lodash'

  export default {
    components: { ConnectionSidebar, MysqlForm, PostgresForm, RedshiftForm, SqliteForm, SqlServerForm },
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
        return config.defaults.connectionTypes
      },
      pageTitle() {
        console.log(this.config)
        if(_.isNull(this.config) || _.isUndefined(this.config.id)) {
          return "Quick Connect"
        } else {
          return this.config.name
        }
      }
    },
    mounted() {
      this.config = this.defaultConfig
      this.$store.dispatch('loadSavedConfigs')
      this.$nextTick(() => {
        const components = [
          this.$refs.sidebar,
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
        console.log("destroying split")
        this.split.destroy()
      }
    },
    methods: {
      edit(config) {
        this.config = config
      },
      changeType() {
        if(this.config.connectionType === 'mysql') {
          this.config.port = 3306
        } else if(this.config.connectionType === 'psql') {
          this.config.port = 5432
        }
      },
      async submit(config) {
        if (config) {
          this.config = config
        }

        this.connectionError = null
        try {
          await this.$store.dispatch('connect', this.config)
        } catch(ex) {
          this.connectionError = ex.message
          this.$noty.error("Error establishing a connection")
        }
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
          return false
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
          this.$store.dispatch('saveConnectionConfig', this.config)
          if(this.config === this.defaultConfig) {
            this.defaultConfig = new SavedConnection()
          }
          this.$noty.success("Connection Information Saved")
        } catch (ex) {
          this.errors = [ex.message]
          this.$noty.error("Could not save connection information")
        }
      }
    },


  }
</script>

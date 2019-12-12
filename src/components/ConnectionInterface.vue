<template>
  <div class="connection-interface flex-row">
    <div ref="sidebar" class="sidebar flex-column connection-sidebar" id="sidebar">
      <connection-sidebar :defaultConfig="defaultConfig" :selectedConfig="config" @edit="edit"></connection-sidebar>
    </div>
    <div ref="content" class="connection-main page-content layout-center" id="page-content">
      <div class="small-wrap">
        <div class="card-flat padding">
          <h3 class="card-title">Connect</h3>
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
            <div v-if="config.connectionType" class="with-connection-type">
              <div class="row gutter">
                <div class="col s9 form-group">
                  <label for="Host">Host</label>
                  <input type="text" class="form-control" name="host" v-model="config.host">
                </div>
                <div class="col s3 form-group">
                  <label for="port">Port</label>
                  <input type="number" class="form-control" name="port" v-model="config.port">
                </div>
              </div>
              <div class="row gutter">
                <div class="col s6 form-group">
                  <label for="user">User</label><input type="text" name="user" v-model="config.user" class="form-control">
                </div>
                <div class="col s6 form-group">
                  <label for="password">Password</label><input type="password" v-model="config.password" class="form-control">
                </div>
              </div>
              <div class="form-group">
                <label for="defaultDatabase">Default Database</label>
                <input type="text" class="form-control" v-model="config.defaultDatabase">
              </div>
              <div class="btn-group flex flex-right">
                <button :disabled="testing" class="btn btn-flat" @click.prevent="testConnection">Test</button>
                <button :disabled="testing" class="btn btn-primary" @click.prevent="submit">Connect</button>
              </div>
              
              <!-- Save Connection -->
              <div class="save-connection">
                <h3>Save Connection</h3>
                <div class="row">
                  <div class="expand"><input class="form-control full" type="text" v-model="config.name" placeholder="Connection Name"></div>
                  <div><button class="btn btn-flat" @click.prevent="save">Save</button></div>
                </div>
              </div>
            </div>
          </form>

        </div>
        <div v-if="connectionError" class="alert alert-danger">
          {{connectionError}}
        </div>
  
      </div>
    </div>

  </div>

</template>

<script>

  import _ from 'lodash'
  import config from '../config'
  import { mapActions } from 'vuex'
  import ConnectionProvider from '../lib/connection-provider'

  import ConnectionSidebar from './ConnectionSidebar'
  import Split from 'split.js'

  export default {
    components: { ConnectionSidebar },
    data() {
      return {
        defaultConfig: _.clone(config.defaults.connectionConfig),
        config: null,
        errors: null,
        connectionError: null,
        testing: false,
        split: null
      }
    },
    mounted() {
      this.config = this.defaultConfig
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
    watch: {
      config: {
        deep: true,
        handler(nu, old) {
        },
      },
    },
    methods: {
      ...mapActions(['saveConnectionConfig', 'saveRecentConnection']),
      edit(config) {
        this.config = config
      },
      changeType(e) {
        if(this.config.connectionType === 'mysql') {
          this.config.port = 3306
        } else if(this.config.connectionType === 'psql') {
          this.config.port = 5432
        }
      },
      async submit() {
        try {
          const connection = ConnectionProvider.for(this.config)
          await connection.connect()
          await this.saveRecentConnection(this.config)
          this.$emit('connected', connection)
        } catch(ex) {
          this.connectionError = ex.message
          this.$noty.error("Error establishing a connection")
        }
      },
      async testConnection(close){
        try {
          this.testing = true
          const connection = ConnectionProvider.for(this.config)
          await connection.connect()
          await connection.end()
          this.$noty.success("Connection looks good!")
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
        this.testConnection(this.config)
        const result = await this.saveConnectionConfig(this.config)
        this.errors = result.errors
        if(result.errors) {
          this.$noty.error("Could not save connection information")
        } else {
          if(this.config === this.defaultConfig) {
            this.defaultConfig = _.clone(config.defaults.connectionConfig)
          }
          this.$noty.success("Connection Information Saved")
        }
      }
    },
    computed: {
      connectionTypes() {
        return config.defaults.connectionTypes
      },
    }

  }
</script>

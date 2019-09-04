<template>
  <div class="connection-interface flex-row">
    <connection-sidebar :defaultConfig="defaultConfig" :selectedConfig="config" @edit="edit"></connection-sidebar>
    <div class="connection-main page-content flex-column" id="page-content">
      <div class="container">
        <div class="row justify-content-sm-center">
          <div class="col-lg-9 col-md-10 col-xl-6">
            <div class="card mt-5">
              <div class="card-body bg-dark text-white">
                <h5 class="card-title">Enter Connection Information</h5>
                <p class="text-danger" v-show="errors">Please fix the following errors</p>
                <ul class="text-danger" v-show="errors">

                  <li v-for="(e, i) in errors" :key="i">{{e}}</li>
                </ul>
                <form @action="submit" v-if="config">
                  <div class="form-group">
                    <label for="connectionType">Connection Type</label>
                    <select name="connectionType" class="form-control custom-select" v-model="config.connectionType" @change="changeType" id="connection-select">
                      <option disabled value="null">Select a connection type...</option>
                      <option :key="t.value" v-for="t in connectionTypes" :value="t.value">{{t.name}}</option>
                    </select>
                  </div>
                  <div v-if="config.connectionType" class="with-connection-type">
                    <div class="row">
                      <div class="form-group col-lg-9">
                        <label for="Host">Host</label>
                        <input type="text" class="form-control" name="host" v-model="config.host">
                      </div>
                      <div class="form-group col-lg-3">
                        <label for="port">Port</label>
                        <input type="number" class="form-control" name="port" v-model="config.port">
                      </div>
                    </div>
                    <div class="row">
                      <div class="form-group col-lg-6">
                        <label for="user">User</label><input type="text" name="user" v-model="config.user" class="form-control">
                      </div>
                      <div class="form-group col-lg-6">
                        <label for="password">Password</label><input type="password" v-model="config.password" class="form-control">
                      </div>

                    </div>
                    <div class="form-group">
                      <label for="defaultDatabase">Default Database</label>
                      <input type="text" class="form-control" v-model="config.defaultDatabase">
                    </div>


                    <div class="text-right">
                      <button :disabled="testing" class="btn btn-success mr-2" @click.prevent="testConnection">Test</button>
                      <button :disabled="testing" class="btn btn-info" @click.prevent="submit">Connect</button>
                    </div>

                    <h5 class="card-title">Save the Connection</h5>
                    <div class="row">
                      <div class="col-lg-8"><input type="text" v-model="config.name" placeholder="Connection Name" class="form-control"></div>
                      <div class="col-lg-4 text-lg-right"><button class="btn btn-primary" @click.prevent="save">Save</button></div>
                    </div>
                  </div>
                </form>

              </div>
              <div v-if="connectionError" class="card-body border-danger border text-danger">
                {{connectionError}}
              </div>


            </div>

          </div>
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

  export default {
    components: { ConnectionSidebar },
    data() {
      return {
        defaultConfig: _.clone(config.defaults.connectionConfig),
        config: null,
        errors: null,
        connectionError: null,
        testing: false,
      }
    },
    mounted() {
      this.config = this.defaultConfig
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

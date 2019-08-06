<template>
  <div class="connection-interface">
    <!-- TODO: move to a component -->
    <div class="connection-sidebar">
      <div id="sidebar-wrapper" class="bg-light border-right">
        <h5 class="p-3">Saved Connections</h5>
        <!-- <div class="sidbar-heading mt-2 p-3">Saved Connections</div> -->
        <div class="list-group list-group-flush">
          <a href="#" class="list-group-item-link list-group-item">
            Foo
            <span class="float-right"><a href="" class="">CONNECT</a></span>
          </a>
        </div>
      </div>
    </div>
    <!-- END TODO -->
    <div class="connection-main">
      <div class="container">
        <div class="row justify-content-sm-center">
          <div class="col-md-6">
            <div class="card mt-5">
              <div class="card-body">
                <h5 class="card-title">Enter Connection Information</h5>
                <form @action="submit">
                  <div class="form-group">
                    <label for="connectionType">Connection Type</label>
                    <select name="connectionType" class="form-control custom-select" v-model="config.connectionType" id="connection-select">
                      <option :key="t.value" v-for="t in connectionTypes" value="t.value">{{t.name}}</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="Host">Host</label>
                    <input type="text" class="form-control" name="host" v-model="config.host">
                  </div>
                  <div class="form-group">
                    <label for="port">Port</label>
                    <input type="number" class="form-control" name="port" v-model="config.port">
                  </div>

                  <div class="text-right">
                    <button class="btn btn-primary mr-2" @click="saveConnection">Save</button>
                    <button class="btn btn-success mr-2" @click="testConnection">Test</button>
                    <button class="btn btn-info" @click="submit">Connect</button>
                  </div>
                </form>
              </div>

            </div>

          </div>
        </div>
        <div class="row justify-content-sm-center mt-5">
          <div class="col-md-6">
            <div class="card">
              <div class="card-body">
                <h5 class="card-title">Recent Connections</h5>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>

  </div>

</template>

<script>

  import ConnectionConfig from '../models/connection-config'
  import _ from 'lodash'

  export default {
    data() {
      return {
        config: ConnectionConfig.build({})
      }
    },
    computed: {
      connectionTypes() {
        return _.map(ConnectionConfig.rawAttributes.connectionType.values, (t) => {
          return {
            value: t,
            name: _.upperFirst(t)
          }
        })
      }
    }
  }
</script>

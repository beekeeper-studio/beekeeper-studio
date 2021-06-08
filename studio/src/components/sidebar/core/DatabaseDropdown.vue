<template>
  <!-- TODO (matthew): either not use select or find good library for dropdowns, this is hideous -- no way to style currently -->
  <div class="fixed">
    <div class="data-select-wrap">
      <div class="select-wrap">
        <select :title="'Database: ' + selectedDatabase" class="database-select" v-model="selectedDatabase">
          <option selected :value="selectedDatabase">{{selectedDatabase}}</option>
          <option v-for="db in availableDatabases" v-bind:key="db" :value="db">{{db}}</option>
        </select>
      </div>
      <a class="refresh" @click.prevent="refreshDatabases" :title="'Refresh Databases'">
        <i class="material-icons">refresh</i>
      </a>
    </div>
  </div>
</template>

<script type="text/javascript">
  import _ from 'lodash'

  export default {
    props: [ 'connection' ],
    data() {
      return {
        currentDatabase: null,
        selectedDatabase: null,
        dbs: [],
      }
    },
    methods: {
      async refreshDatabases() {
        this.dbs = await this.connection.listDatabases()
      }
    },
    async mounted() {
      this.selectedDatabase = await this.connection.currentDatabase()
      this.dbs = await this.connection.listDatabases()
    },
    computed: {
      availableDatabases() {
        return _.without(this.dbs, this.selectedDatabase)
      }
    },
    watch: {
      selectedDatabase() {
        this.$emit('databaseSelected', this.selectedDatabase)
      }
    }
  }
</script>

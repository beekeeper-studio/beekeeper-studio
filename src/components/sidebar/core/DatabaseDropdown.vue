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
      <a class="refresh" @click.prevent="$modal.show('config-add-database')" :title="'Add Database'">
        <i class="material-icons">add</i>
      </a>
    </div>
    <modal class="vue-dialog beekeeper-modal save-add-database" name="config-add-database" height="auto" :scrollable="true">
      <div class="dialog-content">
        <AddDatabaseForm :connection="connection" @databaseCreated="databaseCreated" @cancel="$modal.hide('config-add-database')"></AddDatabaseForm>
      </div>
    </modal>
  </div>
</template>

<script type="text/javascript">
  import _ from 'lodash'
  import AddDatabaseForm from "@/components/connection/AddDatabaseForm";

  export default {
    components: { AddDatabaseForm },
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
      },
      async databaseCreated(db) {
        this.$modal.hide('config-add-database')
        await this.refreshDatabases()
        this.selectedDatabase = db
        this.$emit('databaseSelected', db)
      },
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
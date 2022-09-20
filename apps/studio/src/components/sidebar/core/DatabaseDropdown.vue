<template>
  <div class="fixed">
    <div class="data-select-wrap">
      <v-select :title="'Database: ' + selectedDatabase" v-model="selectedDatabase" :options="availableDatabases" :components="{OpenIndicator}" class="dropdown-search"></v-select>
      <a class="refresh" @click.prevent="refreshDatabases" :title="'Refresh Databases'">
        <i class="material-icons">refresh</i>
      </a>
      <a class="refresh" @click.prevent="$modal.show('config-add-database')" :title="'Add Database'">
        <i class="material-icons">add</i>
      </a>
    </div>
    <modal class="vue-dialog beekeeper-modal save-add-database" name="config-add-database" height="auto" :scrollable="true">
      <div class="dialog-content">
        <add-database-form :connection="connection" @databaseCreated="databaseCreated" @cancel="$modal.hide('config-add-database')"></add-database-form>
      </div>
    </modal>
  </div>
</template>

<script type="text/javascript">
  import _ from 'lodash'
  import AddDatabaseForm from "@/components/connection/AddDatabaseForm"
  import vSelect from 'vue-select'

  export default {
    props: [ 'connection' ],
    data() {
      return {
        currentDatabase: null,
        selectedDatabase: null,
        dbs: [],
        OpenIndicator: {
          render: createElement => createElement('i', {class: {'material-icons': true}}, 'arrow_drop_down')
        }
      }
    },
    components: {
      vSelect,
      AddDatabaseForm
    },
    methods: {
      async refreshDatabases() {
        this.dbs = await this.connection.listDatabases()
      },
      async databaseCreated(db) {
        this.$modal.hide('config-add-database')
        await this.refreshDatabases()
        if (this.connection.connectionType === 'sqlite') {
          return console.log('sqlite stuff ah yeah')
        }
        this.selectedDatabase = db
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

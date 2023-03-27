<template>
  <div class="fixed">
    <div class="data-select-wrap">
      <p
        v-if="this.connection.connectionType === 'sqlite'"
        class="sqlite-db-name"
      >
        {{selectedDatabase}}
      </p>
      <v-select
        v-else
        :title="'Database: ' + selectedDatabase"
        v-model="selectedDatabase"
        :options="availableDatabases"
        :components="{OpenIndicator}"
        class="dropdown-search"
      ></v-select>
      <a v-if="this.connection.connectionType !== 'sqlite'" class="refresh" @click.prevent="refreshDatabases" :title="'Refresh Databases'">
        <i class="material-icons">refresh</i>
      </a>
      <a class="refresh" @click.prevent="$modal.show('config-add-database')" :title="'Add Database'">
        <i class="material-icons">add</i>
      </a>
    </div>
    <portal to="modals">
      <modal class="vue-dialog beekeeper-modal save-add-database" name="config-add-database" height="auto" :scrollable="true">
        <div class="dialog-content">
          <add-database-form :connection="connection" @databaseCreated="databaseCreated" @cancel="$modal.hide('config-add-database')"></add-database-form>
        </div>
      </modal>
    </portal>
  </div>
</template>

<script type="text/javascript">
  import _ from 'lodash'
  import { ipcRenderer } from 'electron'
  import vSelect from 'vue-select'
  import {AppEvent} from '@/common/AppEvent'
  import AddDatabaseForm from "@/components/connection/AddDatabaseForm"

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
        console.log(this.selectedDatabase)
        if (this.connection.connectionType === 'sqlite') {
          const fileLocation = this.selectedDatabase.split('/')
          fileLocation.pop()
          return ipcRenderer.send(AppEvent.menuClick, 'newWindow', { url: `${fileLocation.join('/')}/${db}.db` })
        }
        await this.refreshDatabases()
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

<style lang="scss" scoped>
  .sqlite-db-name {
    width: 90%;
    overflow:hidden;
  }
</style>
<template>
  <div class="fixed">
    <div class="data-select-wrap">
      <p
        v-if="!dialect.disabledFeatures?.multipleDatabase"
        class="sqlite-db-name"
        :title="selectedDatabase"
      >
        {{ selectedDatabase }}
      </p>
      <v-select
        v-else
        :title="'Database: ' + selectedDatabase"
        v-model="selectedDatabase"
        :options="availableDatabases"
        :components="{OpenIndicator}"
        placeholder="Select a database..."
        class="dropdown-search"
      />
      <a
        v-if="dialect.disabledFeatures?.multipleDatabase"
        class="refresh"
        @click.prevent="refreshDatabases"
        :title="'Refresh Databases'"
      >
        <i class="material-icons">refresh</i>
      </a>
      <a
        class="refresh"
        @click.prevent="$modal.show('config-add-database')"
        :title="'Add Database'"
      >
        <i class="material-icons">add</i>
      </a>
    </div>
    <portal to="modals">
      <modal
        class="vue-dialog beekeeper-modal save-add-database"
        name="config-add-database"
        height="auto"
        :scrollable="true"
      >
        <!-- TODO: Make sure one of the elements in this modal is focused so that the keyboard trap works -->
        <div
          class="dialog-content"
          v-kbd-trap="true"
        >
          <add-database-form
            @databaseCreated="databaseCreated"
            @cancel="$modal.hide('config-add-database')"
          />
        </div>
      </modal>
    </portal>
  </div>
</template>

<script type="text/javascript">
  import _ from 'lodash'
  import vSelect from 'vue-select'
  import {AppEvent} from '@/common/AppEvent'
  import AddDatabaseForm from "@/components/connection/AddDatabaseForm.vue"
  import { mapActions, mapState, mapGetters } from 'vuex'

  export default {
    props: [ ],
    data() {
      return {
        selectedDatabase: null,
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
      ...mapActions({refreshDatabases: 'updateDatabaseList'}),
      ...mapState({ connectionType: 'connectionType' }),
      async databaseCreated(db) {
        this.$modal.hide('config-add-database')
        if (this.dialect.disabledFeatures?.multipleDatabase) {
          const fileLocation = this.selectedDatabase.split('/')
          fileLocation.pop()
          const url = this.connectionType === 'sqlite' ? `${fileLocation.join('/')}/${db}.db` : `${fileLocation.join('/')}/${db}`
          return window.main.send(AppEvent.menuClick, 'newWindow', { url })
        }
        await this.refreshDatabases()
        this.selectedDatabase = db
      }
    },
    async mounted() {
      this.selectedDatabase = this.currentDatabase
    },
    computed: {
      availableDatabases() {
        return _.without(this.dbs, this.selectedDatabase)
      },
      ...mapState({currentDatabase: 'database', dbs: 'databaseList'}),
      ...mapGetters(['dialect']),
    },
    watch: {
      currentDatabase(newValue) {
        if (this.selectedDatabase !== newValue) {
          this.selectedDatabase = newValue
        }
      },
      selectedDatabase() {
        if (this.selectedDatabase != this.currentDatabase) {
          this.$emit('databaseSelected', this.selectedDatabase)
        }
      }
    }
  }
</script>

<style lang="scss" scoped>
  .sqlite-db-name {
    width: 90%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding-left: 0.75rem;
  }
</style>

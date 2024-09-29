<template>
  <div class="fixed">
    <div class="data-select-wrap">
      <!-- FIXME: move this comparison to the DialectData -->
      <p
        v-if="this.connectionType === 'sqlite'"
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
      <!-- FIXME: move this comparison to the DialectData -->
      <a
        v-if="this.connectionType !== 'sqlite'"
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
      <a
        v-if="dbs.length > 1"
        class="refresh"
        @click.prevent="$modal.show('drop-database')"
        :title="'Drop Database'"
      >
        <i class="material-icons">delete_forever</i>
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
          v-if="this.connectionType === 'oracle'"
          class="dialog-content"
          v-kbd-trap="true"
        >
          <p>
            Oracle has a lot of <a
              class="external-link"
              href="https://docs.oracle.com/cd/B19306_01/server.102/b14231/create.htm#i1008760"
            >configuration requirements to create a new database</a> which makes it difficult for Beekeeper to do automatically.
          </p>
          <p>Beekeeper can generate you some boilerplate code to get you started if you like.</p>
          <div class="vue-dialog-buttons">
            <button
              class="btn btn-flat"
              type="button"
              @click.prevent="$modal.hide('config-add-database')"
            >
              Cancel
            </button>
            <button
              class="btn btn-primary"
              type="button"
              @click.prevent="createDatabaseSQL"
            >
              Generate Create Database Boilerplate
            </button>
          </div>
        </div>
        <div
          v-else
          class="dialog-content"
          v-kbd-trap="true"
        >
          <add-database-form
            @databaseCreated="databaseCreated"
            @cancel="$modal.hide('config-add-database')"
          />
        </div>
      </modal>
      <modal
        name="drop-database"
        class="beekeeper-modal vue-dialog save-add-database"
      >
        <div v-kbd-trap="true">
          <div class="dialog-content">
            <div class="dialog-c-title">
              Really Drop <span class="tab-like"><tab-icon
                :tab="tabIcon"
              /> {{ this.selectedDatabase }}</span>?
            </div>
            <p>Dropping a database is serious business. Make sure you really want to do this. This change cannot be undone.</p>
          </div>
          <div class="vue-dialog-buttons">
            <span class="expand" />
            <button
              ref="no"
              @click.prevent="$modal.hide('drop-database')"
              class="btn btn-sm btn-flat"
            >
              Cancel
            </button>
            <button
              @click.prevent="completeDeleteAction"
              class="btn btn-sm btn-primary"
            >
              Drop {{ this.selectedDatabase }}
            </button>
          </div>
        </div>
      </modal>
    </portal>
  </div>
</template>

<script type="text/javascript">
  import _ from 'lodash'
  import vSelect from 'vue-select'
  import {AppEvent} from '@/common/AppEvent'
  import TabIcon from '@/components/tab/TabIcon.vue'
  import AddDatabaseForm from "@/components/connection/AddDatabaseForm.vue"
  import { mapActions, mapState } from 'vuex'

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
      AddDatabaseForm,
      TabIcon
    },
    methods: {
      ...mapActions({refreshDatabases: 'updateDatabaseList'}),
      ...mapState({ connectionType: 'connectionType' }),
      async databaseCreated(db) {
        this.$modal.hide('config-add-database')
        // FIXME: move this comparison to the DialectData
        if (this.connectionType.match(/sqlite|firebird/)) {
          const fileLocation = this.selectedDatabase.split('/')
          fileLocation.pop()
          const url = this.connectionType === 'sqlite' ? `${fileLocation.join('/')}/${db}.db` : `${fileLocation.join('/')}/${db}`
          return window.main.send(AppEvent.menuClick, 'newWindow', { url })
        }
        await this.refreshDatabases()
        this.selectedDatabase = db
      },
      completeDeleteAction() {
        const databaseToDelete = this.selectedDatabase
        this.$modal.hide('drop-database')
        this.selectedDatabase = this.availableDatabases[0]
        this.$nextTick(async () => {
          try {
            await this.$util.send("conn/dropElement", {
              elementName: databaseToDelete,
              typeOfElement: "DATABASE"
            });
            await this.refreshDatabases()
            this.$noty.success(`${databaseToDelete} Database dropped successfully`)
          } catch (ex) {
            this.$noty.error(`Error dropping database: ${ex.message}`)
          }
        })
      },
      createDatabaseSQL() {
        this.$root.$emit(AppEvent.newTab, this.connection.createDatabaseSQL())
        this.$modal.hide('config-add-database')
      }
    },
    async mounted() {
      this.selectedDatabase = this.currentDatabase
    },
    computed: {
      ...mapState({currentDatabase: 'database', dbs: 'databaseList'}),
      availableDatabases() {
        return _.without(this.dbs, this.selectedDatabase)
      },
      tabIcon() {
        return {
          tabType: 'database',
          entityType: 'database'
        }
      },
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

  .external-link {
    text-decoration: underline;
    & :hover {
      text-decoration: none;
    }
  }
</style>

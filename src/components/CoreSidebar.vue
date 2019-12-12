<template>
  <div>
    <database-dropdown @databaseSelected="databaseSelected" :connection="connection"></database-dropdown>

    <div class="search-wrap">
      <input type="text" placeholder="Filter">
    </div>

    <div class="sidebar-heading">Tables</div>

    <nav class="list-group flex-col" v-if="tables">
      <template v-for="table in tables" v-key="table.name">
        <table-list-item :table="table" :connection="connection" ></table-list-item>
      </template>
    </nav>
    <span class="expand"></span>
    <div class="status">
      <small class="text-success"><i class="material-icons">brightness_1</i> Connected</small>
    </div>
  </div>
</template>

<script>
  import _ from 'lodash'
  import TableListItem from './TableListItem.vue'
  import DatabaseDropdown from './DatabaseDropdown.vue'

  export default {
    components: { TableListItem, DatabaseDropdown },
    props: ['connection'],
    data() {
      return {
        tables: null,
        tableLoadError: null,
        database: null
      }
    },
    methods: {
      async loadTables() {
        try {
          this.tables = await this.connection.listTables()
        } catch(ex) {
          this.tableLoadError = ex.message
          this.$noty.error("Error loading tables")
        }
      },
      databaseSelected(db) {
        this.$emit('databaseSelected', db)
      }
    },
    async mounted() {
      window.connection = this.connection
      this.database = this.connection.database
      await this.loadTables()
    },
    watch: {
      database(nuValue, oldValue) {
        if(_.isNil(oldValue)) {
          return
        }
        this.connection.setDatabase(nuValue)
        this.loadTables()
      }
    }
  }
</script>

<template>
  <div>
    <div class="data-select-wrap">
      <select class="database-select" v-model="database">
        <option selected>Public</option>
        <option value="1">One</option>
        <option value="2">Two</option>
        <option value="3">Three</option>
      </select>
    </div>

    <div class="search-wrap">
      <input type="text" placeholder="Filter">
    </div>

    <div class="sidebar-heading">Tables</div>

    <nav class="flex-column" v-if="tables">
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

  export default {
    components: { TableListItem },
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

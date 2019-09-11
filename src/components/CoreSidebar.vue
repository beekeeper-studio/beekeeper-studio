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

    <nav class="list-group flex-col" v-if="tables">
      <template v-for="table in tables" v-key="table.name">
        <a :href="table.name + '-details'" data-toggle="collapse" role="button">
          <i class="item-icon material-icons">grid_on</i>
          <span>{{table.name}}</span>
        </a>
        <div class="sub-items collapse" :id="table.name + '-details'">
          <span v-if="table.columns" v-for="c in table.columns" class="sub-item">
            <span class="title">{{c.name}}</span>
            <span class="badge badge-info">{{c.dataType}}</span>
          </span>
        </div>
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

  export default {
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
          this.tables = await this.connection.getTables(this.database)
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

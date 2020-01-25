<template>
  <div>
    <!-- TODO (gregory) This stuff shouldn't scroll -->
    <div class="shouldnt-scroll">
      <database-dropdown @databaseSelected="databaseSelected" :connection="connection"></database-dropdown>

      <div class="sidebar-heading">Tables</div>

      <div class="search-wrap">
        <input type="text" placeholder="Filter">
      </div>
      
    </div>

    <nav class="list-group flex-col" v-if="tables">
      <!-- TODO (gregory) open the 'performance_schema' db  -->
      <!-- Tables with long names require horizontal scrolling -->
      <!--  This whole div shouldn't horizontal scroll, just cut-off the table names -->
      <table-list-item v-for="table in tables" v-bind:key="table.name" :table="table" :connection="connection" ></table-list-item>
    </nav>
    <!-- TODO (gregory): Make the 'no tables div nicer' -->
    <div v-if="tables.length == 0">
      There are no tables in {{database}}
    </div>
    <!-- TODO (gregory): Make the disconnect button nicer  -->
    <!--  Maybe move the 'bottom bar' so it's just in the sidebar then it can have a disconnect button -->
    <!-- maybe the disconnect button is a power button? -->
    <div class="stick-to-bottom">
      <button class="btn btn-primary" @click.prevent="disconnect()">disconnect</button>
    </div>
  </div>
</template>

<script>
  import TableListItem from './TableListItem.vue'
  import DatabaseDropdown from './DatabaseDropdown.vue'
  import { mapState } from 'vuex'

  export default {
    components: { TableListItem, DatabaseDropdown },
    data() {
      return {
        tableLoadError: null
      }
    },
    mounted() {
      this.$store.dispatch('updateTables')
    },
    computed: mapState(['tables', 'connection', 'database']),
    methods: {
      async databaseSelected(db) {
        await this.$store.dispatch('changeDatabase', db)
      },
      async disconnect() {
        await this.$store.dispatch('disconnect')
        this.$noty.success("Successfully Disconnected")
      }
    }
  }
</script>

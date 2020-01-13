<template>
  <div>
    <database-dropdown @databaseSelected="databaseSelected" :connection="connection"></database-dropdown>

    <div class="search-wrap">
      <input type="text" placeholder="Filter">
    </div>

    <div class="sidebar-heading">Tables</div>

    <nav class="list-group flex-col" v-if="tables">
      <table-list-item v-for="table in tables" v-bind:key="table.name" :table="table" :connection="connection" ></table-list-item>
    </nav>
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
        tableLoadError: null,
        database: null
      }
    },
    mounted() {
      this.$store.dispatch('updateTables')
    },
    computed: mapState(['tables', 'connection']),
    methods: {
      databaseSelected(db) {
        this.$store.dispatch('changeDatabase', db)
      }
    }
  }
</script>

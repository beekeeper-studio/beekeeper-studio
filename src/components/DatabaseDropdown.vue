<template>
  <div class="data-select-wrap">
    <i class="material-icons">storage</i>
    <select class="database-select" v-model="selectedDatabase">
      <option selected :value="selectedDatabase">{{selectedDatabase}}</option>
      <option v-for="db in availableDatabases" v-bind:key="db" :value="db">{{db}}</option>
    </select>
  </div>
</template>

<script type="text/javascript">
  import _ from 'lodash'

  export default {
    props: [ 'connection' ],
    data() {
      return {
        currentDatabase: null,
        selectedDatabase: null,
        dbs: [],
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
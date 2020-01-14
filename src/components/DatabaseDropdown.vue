<template>
  <div class="data-select-wrap">
    <select class="database-select" v-model="selectedDatabase">
      <option selected :value="currentDatabase">{{currentDatabase}}</option>
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
        availableDatabases: [],
        currentDatabase: null,
        selectedDatabase: null
      }
    },
    async mounted() {
      this.currentDatabase = await this.connection.currentDatabase()
      this.selectedDatabase = this.currentDatabase

      const dbs = await this.connection.listDatabases()
      this.availableDatabases = _.without(dbs, this.currentDatabase)
    },
    watch: {
      selectedDatabase() {
        if (this.selectedDatabase != this.currentDatabase) {
          this.$emit('databaseSelected', this.selectedDatabase)
        }

      }
    }
  }
</script>
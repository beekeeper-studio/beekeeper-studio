<template>
  <div class="fixed">
    <div class="data-select-wrap">
      <v-select :title="'Database: ' + selectedDatabase" v-model="selectedDatabase" :options="availableDatabases" :components="{OpenIndicator}" class="dropdown-search"></v-select>
      <a class="refresh" @click.prevent="refreshDatabases" :title="'Refresh Databases'">
        <i class="material-icons">refresh</i>
      </a>
    </div>
  </div>
</template>

<script type="text/javascript">
  import _ from 'lodash'
  import vSelect from 'vue-select'

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
      vSelect
    },
    methods: {
      async refreshDatabases() {
        this.dbs = await this.connection.listDatabases()
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

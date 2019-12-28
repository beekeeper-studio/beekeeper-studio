<template>
  <div class="saved-connections">
    <div v-if="editable">
      <form @action="submit">
        <div class="form-group">
          <label>Name</label>
          <input type="text" class="form-control" v-model="editable.name"></input>
        </div>
      </form>
    </div>
    <ul>
      <li @click.prevent="edit(connection)" v-for="(connection, i) in connections" :key="i">
        {{connection.name}}
      </li>
    </ul>
  </div>
</template>

<script type="text/javascript">
  import { Connection } from '../model/base.js'

  export default {
    data() {
      return {
        connections: [],
        editable: null
      }
    },
    async mounted() {
      console.log(Connection)
      this.connections = await Connection().fetch()
    },
    methods: {
      edit(connection) {
        this.ediable = connection
      },
      submit() {
        
      }
    }

  }
</script>
<template>
  <div class="beekeeper-studio-wrapper">
    <connection-interface v-if="!connection" @connected="connected"></connection-interface>
    <core-interface @databaseSelected="databaseSelected" v-else :connection="connection"></core-interface>
  </div>
</template>

<script>

import CoreInterface from './components/CoreInterface'
import ConnectionInterface from './components/ConnectionInterface'

export default {
  name: 'app',
  components: {
    CoreInterface, ConnectionInterface
  },
  data() {
    return {
      connection: null
    }
  },
  methods: {
    connected(connection) {
      this.connection = connection
    },
    databaseSelected(db) {
      console.log("Do something here! (Db selected) " + db)
    }
  }
}
</script>

<style>
</style>

<template>
  <div class="beekeeper-studio-wrapper">
    <connection-interface v-if="!connection"></connection-interface>
    <core-interface @databaseSelected="databaseSelected" v-else :connection="connection"></core-interface>
  </div>
</template>

<script>


import CoreInterface from './components/CoreInterface'
import ConnectionInterface from './components/ConnectionInterface'
// import DbTest from './components/DbTest'

export default {
  name: 'app',
  components: {
    CoreInterface, ConnectionInterface
  },
  data() {
    return {
    }
  },
  computed: {
    connection() {
      return this.$store.state.connection
    }
  },
  methods: {
    databaseSelected(db) {
      console.log("Do something here! (Db selected) " + db)
    }
  }
}
</script>

<style>
</style>

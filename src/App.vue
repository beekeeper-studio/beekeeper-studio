<template>
  <div class="beekeeper-studio-wrapper">
    <connection-interface v-if="!connection" @connected="connected" ></connection-interface>
    <core-interface v-else :connection="connection"></core-interface>
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
  method: {
    connected(connection) {
      this.connection = connection
    }
  }
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>

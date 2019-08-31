<template>
  <div class="beekeeper-studio-wrapper">
    <connection-interface v-if="!connection" @connected="connected"></connection-interface>
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
  methods: {
    connected(connection) {
      this.connection = connection
    }
  }
}
</script>

<style>
</style>

<template>
  <core-interface :connection="connectionConfig"></core-interface>
</template>

<script>

import ConnectionConfig from './models/connection-config'

import CoreInterface from './components/CoreInterface'
import ConnectionInterface from './components/ConnectionInterface'

export default {
  name: 'app',
  components: {
    CoreInterface
  },
  async data() {
    return {
      connectionConfig: await ConnectionConfig.findOne({})
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

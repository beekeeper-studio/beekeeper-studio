<template>
  <core-interface></core-interface>
</template>

<script>
import CoreInterface from './components/CoreInterface'

export default {
  name: 'app',
  components: {
    CoreInterface
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

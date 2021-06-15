<template>
  <div id="app">
    <app-header/>
    <router-view/>
  </div>
</template>

<script>
import AppHeader from '@/components/AppHeader.vue';

export default {
  name: 'app',
  components: {
    AppHeader
  }
}
</script>

<style lang="scss" scoped>
  #app {
    padding-top: 6rem;
  }
</style>

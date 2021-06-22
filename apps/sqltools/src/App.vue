<template>
  <div id="app" class="theme-dark">
    <app-header/>
    <router-view :key="$route.fullPath"/>
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
    padding-top: 4rem;
  }
</style>

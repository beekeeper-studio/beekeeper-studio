<template>
  <div id="app" class="theme-dark">
    <app-header/>
    <router-view :key="$route.fullPath"/>
    <footer>
      <div class="small-wrap flex-col flex-middle">
        <small class="created-by">
          <span>Made by&nbsp;</span>
          <router-link to="https://beeekeeperstudio.io">Beekeeper Studio</router-link>
        </small>
      </div>
    </footer>
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

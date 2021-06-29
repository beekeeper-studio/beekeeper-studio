<template>
  <div id="app" class="theme-dark">
    <app-header/>
    <router-view :key="$route.fullPath"/>
    <span class="expand"></span>
    <footer>
      <div class="small-wrap flex-col flex-middle">
        <small class="created-by">
          <span>Made by&nbsp;</span>
          <a href="https://beekeeperstudio.io" target="_blank">Beekeeper Studio</a>
          <span>&nbsp; with ♥ in Dallas, TX</span>
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
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    height: 100%;
    padding-top: 4rem;
  }
</style>

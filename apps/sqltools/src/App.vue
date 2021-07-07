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
    <div class="scripts" v-if="production">
      <component :is="'script'" src="https://eel.beekeeperstudio.io/script.js" data-spa="auto" data-site="IXJBRDTH" defer></component>
    </div>
    <div v-else class="no-analytics">
      <!-- No analytics scripts -->
    </div>
  </div>

</template>

<script>
import AppHeader from '@/components/AppHeader.vue';

export default {
  metaInfo: {
    titleTemplate: "%s | SQLTools",
    title: "SQLTools by Beekeeper Studio"
  },
  data() {
    return {
      production: process.env.NODE_ENV === 'production'
    }
  },
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

<template>
  <div v-if="false"></div>
</template>
<script lang="ts">
import {DataModules} from '@/store/DataModules'
import Vue from 'vue'
import { mapGetters, mapState } from 'vuex'
import globals from '@/common/globals'

  
export default Vue.extend({
  data: () => ({
    interval: null,
  }),
  mounted() {
    this.mountAndRefresh()
    this.$store.commit('storeInitialized', true)
    this.interval = setInterval(this.poll, globals.dataCheckInterval)
  },
  beforeDestroy() {
    if (this.interval) clearInterval(this.interval);
    DataModules.forEach((module) => {
      if (this.$store.hasModule(module.path)) {
        this.$store.unregisterModule(module.path)
      }
    })

  },

  computed: {
    ...mapState(['workspaceId']),
    ...mapGetters(['workspace']),
  },
  watch: {
    workspaceId() {
      this.mountAndRefresh()
      this.$store.dispatch('loadUsedConfigs')
    }
  },
  methods: {
    poll() {
      DataModules.forEach((module) => {
        if (this.$store.hasModule(module.path)) {
          this.$store.dispatch(`${module.path}/poll`)
        }
      })
    },
    mountAndRefresh() {
      console.log('mount and refresh')
      if (!this.workspace) return
      const scope = this.workspace.type
      DataModules.forEach((module) => {
        const choice = module[scope]
        if (!choice) throw new Error(`No module defined for ${scope} - ${module.path}`)
        console.log("DataManager checking", module.path)
        if (this.$store.hasModule(module.path)) {
          console.log("DataManager --> unregistering", module.path)
          this.$store.unregisterModule(module.path)
        }
        console.log("DataManager --> registering", module.path)
        this.$store.registerModule(module.path, choice)
        this.$store.dispatch(`${module.path}/load`)
      })
    },
  }
})
</script>
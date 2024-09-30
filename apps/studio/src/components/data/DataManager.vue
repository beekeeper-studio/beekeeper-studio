<template>
  <div v-if="false" />
</template>
<script lang="ts">
import _ from 'lodash'
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
    ...mapState(['workspaceId', 'usedConfig']),
    ...mapGetters(['workspace']),
    ...mapState('tabs', {'activeTab': 'active'}),
    importantTabStuff() {
      if (!this.activeTab) return []

      return [
        this.activeTab.unsavedText,
        this.activeTab.filters,
        this.activeTab.title,
      ]
    }

  },
  watch: {
    workspaceId() {
      this.mountAndRefresh()
      this.$store.dispatch('data/usedconnections/load')
      this.$store.dispatch('pinnedConnections/loadPins')
    },
    importantTabStuff: {
      deep: true,
      handler() {
        this.saveTab()
        _.debounce(this.saveTab, 2000)
      }
    }
  },
  methods: {
    saveTab: _.debounce(function() {
      this.$store.dispatch('tabs/save', this.activeTab)
    }, 500),
    poll() {
      DataModules.forEach((module) => {
        if (this.$store.hasModule(module.path)) {
          this.$store.dispatch(`${module.path}/poll`)
        }
      })
    },
    mountAndRefresh() {
      console.log('mount and refresh: ', this.workspace)
      if (!this.workspace) return
      const scope = this.$store.getters.isUltimate ? this.workspace.type : 'local'
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

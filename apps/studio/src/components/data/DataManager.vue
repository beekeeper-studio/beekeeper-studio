<template>
  <div v-if="false"></div>
</template>
<script lang="ts">
import { CloudConnectionModule } from '@/store/modules/data/connection/CloudConnectionModule'
import { LocalConnectionModule } from '@/store/modules/data/connection/LocalConnectionModule'
import { CloudQueryModule } from '@/store/modules/data/query/CloudQueryModule'
import { LocalQueryModule } from '@/store/modules/data/query/LocalQueryModule'
import { LocalQueryFolderModule } from '@/store/modules/data/query_folder/LocalQueryFolderModule'
import { CloudQueryFolderModule } from '@/store/modules/data/query_folder/CloudQueryFolderModule'
import { CloudConnectionFolderModule } from '@/store/modules/data/connection_folder/CloudConnectionFolderModule'
import { LocalConnectionFolderModule } from '@/store/modules/data/connection_folder/LocalConnectionFolderModule'
import Vue from 'vue'
import { mapGetters, mapState } from 'vuex'
import globals from '@/common/globals'

  
const dataModules = [
  {
    path: 'data/queries',
    local: LocalQueryModule,
    cloud: CloudQueryModule,
  },
  {
    path: 'data/connections',
    cloud: CloudConnectionModule,
    local: LocalConnectionModule
  },
  {
    path: 'data/queryFolders',
    cloud: CloudQueryFolderModule,
    local: LocalQueryFolderModule
  },
  {
    path: 'data/connectionFolders',
    cloud: CloudConnectionFolderModule,
    local: LocalConnectionFolderModule
  }

]

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
    dataModules.forEach((module) => {
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
      dataModules.forEach((module) => {
        if (this.$store.hasModule(module.path)) {
          this.$store.dispatch(`${module.path}/poll`)
        }
      })
    },
    mountAndRefresh() {
      console.log('mount and refresh')
      if (!this.workspace) return
      const scope = this.workspace.type
      dataModules.forEach((module) => {
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
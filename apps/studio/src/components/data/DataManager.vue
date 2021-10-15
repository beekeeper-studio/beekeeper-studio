<template>
  <div v-if="false"></div>
</template>
<script lang="ts">
import { CloudConnectionModule } from '@/store/modules/data/connection/CloudConnectionModule'
import { LocalConnectionModule } from '@/store/modules/data/connection/LocalConnectionModule'
import { CloudQueryModule } from '@/store/modules/data/query/CloudQueryModule'
import { LocalQueryModule } from '@/store/modules/data/query/LocalQueryModule'
import Vue from 'vue'
import { mapGetters, mapState } from 'vuex'


const dataModules = [
  {
    path: 'data/queries',
    local: LocalQueryModule,
    cloud: CloudQueryModule
  },
  {
    path: 'data/connections',
    cloud: CloudConnectionModule,
    local: LocalConnectionModule
  }
]

export default Vue.extend({
  mounted() {
    this.mountAndRefresh()
  },
  beforeDestroy() {
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
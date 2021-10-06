<template>
  <div v-if="false"></div>
</template>
<script lang="ts">
import { CloudConnectionModule } from '@/store/modules/data/connection/CloudConnectionModule'
import { LocalConnectionModule } from '@/store/modules/data/connection/LocalConnectionModule'
import { CloudQueryModule } from '@/store/modules/data/query/CloudQueryModule'
import { LocalQueryModule } from '@/store/modules/data/query/LocalQueryModule'
import Vue from 'vue'
import { mapState } from 'vuex'


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
    if (this.workspace) this.mountAndRefresh()
  },
  beforeDestroy() {
    dataModules.forEach((module) => {
      if (this.$store.hasModule(module.path)) {
        this.$store.unregisterModule(module.path)
      }
    })
  },

  computed: {
    ...mapState(['workspace']),
    workspaceId() {
      return this.workspace?.id
    }
  },
  watch: {
    workspaceId() {
      if (this.workspaceId) this.mountAndRefresh()
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
        if (this.$store.hasModule(module.path)) {
          this.$store.unregisterModule(module.path)
        }
        this.$store.registerModule(module.path, choice)
        this.$store.dispatch(`${module.path}/load`)
      })
    },
  }
})
</script>
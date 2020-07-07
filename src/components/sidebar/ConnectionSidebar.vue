<template>
  <div class="sidebar-wrap flex-col">

    <!-- Saved Connections -->
    <div class="saved-connection-list" ref="savedConnectionList">
      <div class="sidebar-heading">
        <div class="status connected sidebar-title row flex-middle noselect">
          <span>Saved Connections <span class="badge">{{connectionConfigs.length}}</span></span>
        </div>
      </div>
      <nav class="list-group expand">
        <connection-list-item
          v-for="c in connectionConfigs"
          :key="c.id"
          :config="c"
          :selectedConfig="selectedConfig"
          @edit="edit"
          @remove="remove"
          @doubleClick="connect"
        >
        </connection-list-item>

      </nav>

    </div>

    <!-- Recent Connections -->
    <div class="recent-connection-list" ref="recentConnectionList">
      <div class="sidebar-heading">
        <div class="status connected sidebar-title row flex-middle noselect">
          <span>Recent Connections <span class="badge">{{usedConfigs.length}}</span></span>
        </div>
      </div>
      <nav class="list-group expand">
        <connection-list-item
          v-for="c in usedConfigs"
          :key="c.id"
          :config="c"
          :selectedConfig="selectedConfig"
          :isRecentList="true"
          @edit="edit"
          @remove="removeUsedConfig"
          @doubleClick="connect"
          @copyToNew="copyToNew"
        >
        </connection-list-item>
      </nav>


    </div>
    <!-- QUICK CONNECT -->
    <div class="btn-wrap quick-connect">
      <a
        href=""
        class="btn btn-flat btn-icon btn-block"
        :class="{'active': defaultConfig == selectedConfig }"
        @click.prevent="edit(defaultConfig)"
      >
      <i class="material-icons">offline_bolt</i>
      <span>Quick Connect</span>
      </a>
    </div>
  </div>
</template>

<script>
  import { mapState, mapGetters } from 'vuex'
  import ConnectionListItem from './connection/ConnectionListItem'
  import Split from 'split.js'
  export default {
    components: { ConnectionListItem },
    props: ['defaultConfig', 'selectedConfig'],
    data: () => ({
      split: null,
      sizes: [60, 40],
    }),
    computed: {
      ...mapState(['connectionConfigs']),
      ...mapGetters({'usedConfigs': 'orderedUsedConfigs'}),
      components() {
        return [
          this.$refs.savedConnectionList,
          this.$refs.recentConnectionList
        ]
      }
    },
    mounted() {
      this.split = Split(this.components, {
        elementStyle: (dim, size) => ({
          'flex-basis': `calc(${size}%)`
        }),
        direction: 'vertical',
        sizes: this.sizes
      })
    },
    methods: {
      edit(config) {
        this.$emit('edit', config)
      },
      connect(config) {
        this.$emit('connect', config)
      },
      remove(config) {
        this.$emit('remove', config)
      },
      removeUsedConfig(config) {
        this.$store.dispatch('removeUsedConfig', config)
      },
      copyToNew(config) {
        const newConfig = config.toNewConnection()
        this.$emit('edit', newConfig)
      },
      getLabelClass(color) {
        return `label-${color}`
      }
    }
  }
</script>

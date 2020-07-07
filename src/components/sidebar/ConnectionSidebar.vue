<template>
  <div class="sidebar-wrap flex-col">

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

    <!-- Saved Connections -->
    <div class="list-group saved-connection-list" ref="savedConnectionList">
      <div class="list-heading">
        <div class="sub row flex-middle noselect">
          Saved Connections <span class="badge">{{connectionConfigs.length}}</span>
        </div>
      </div>
      <nav class="list-body">
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

    <hr> <!-- Fake gutter for split.js -->

    <!-- Recent Connections -->
    <div class="list-group recent-connection-list" ref="recentConnectionList">
      <div class="list-heading">
        <div class="sub row flex-middle noselect">
          Recent Connections <span class="badge">{{usedConfigs.length}}</span>
        </div>
      </div>
      <nav class="list-body">
        <connection-list-item
          v-for="c in usedConfigs"
          :key="c.id"
          :config="c"
          :selectedConfig="selectedConfig"
          :isRecentList="true"
          @edit="edit"
          @remove="removeUsedConfig"
          @doubleClick="connect"
        >
        </connection-list-item>
      </nav>
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
      getLabelClass(color) {
        return `label-${color}`
      }
    }
  }
</script>

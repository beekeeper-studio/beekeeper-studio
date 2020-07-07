<template>
  <div class="sidebar-wrap flex-col">

    <!-- Saved Connections -->
    <div class="sidebar-heading">
      <div class="status connected sidebar-title row flex-middle noselect">
        <span>Saved Connections</span>
      </div>
    </div>
    <nav class="list-group expand">
      <connection-list-item
        v-for="c in connectionConfigs"
        :key="c.id"
        :config="c"
        @edit="edit"
        @remove="remove"
        @doubleClick="connect"
      >
      </connection-list-item>

    </nav>

    <!-- Recent Connections -->
    <div class="sidebar-heading">
      <div class="status connected sidebar-title row flex-middle noselect">
        <span>Recent Connections</span>
      </div>
    </div>
    <nav class="list-group expand">
      <connection-list-item
        v-for="c in usedConfigs"
        :key="c.id"
        :config="c"
        @edit="edit"
        @remove="removeUsedConfig"
        @doubleClick="connect"
        @copyToDefault="copyToDefault"
      >
      </connection-list-item>
    </nav>

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
  export default {
    props: ['defaultConfig', 'selectedConfig'],
    computed: {
      ...mapState(['connectionConfigs']),
      ...mapGetters({'usedConfigs': 'orderedUsedConfigs'})
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

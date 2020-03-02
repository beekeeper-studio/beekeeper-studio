<template>
  <div class="flex-col expand">
    <div class="sidebar-heading">
      <div class="status connected sidebar-title row flex-middle">
        <span>Saved Connections</span>
      </div>
    </div>
    <nav class="list-group expand">
      <div class="list-item">
        <a
          href=""
          class="list-item-btn"
          v-for="c in connectionConfigs"
          :key="c.id"
          :class="{'active': c == selectedConfig }"
          @click.prevent="edit(c)"
          @dblclick.prevent="connect(c)"
        >{{c.name}} ({{c.connectionType}})</a>
      </div>
    </nav>
    <div class="btn-wrap quick-connect">
      <a
        href=""
        class="btn btn-link btn-block"
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
  export default {
    props: ['defaultConfig', 'selectedConfig'],
    computed: {
      connectionConfigs() {
        return this.$store.state.connectionConfigs
      }
    },
    methods: {
      edit(config) {
        this.$emit('edit', config)
      },
      connect(config) {
        this.$emit('connect', config)
      }
    }
  }
</script>

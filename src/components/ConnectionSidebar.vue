<template>
  <nav class="list-group">
    <div class="btn-wrap">
      <a
        href=""
        class="quick-connect btn btn-primary btn-block"
        :class="{'active': defaultConfig == selectedConfig }"
        @click.prevent="edit(defaultConfig)"
      >Quick Connect</a>
    </div>
    <div class="list-heading sub">Saved Connections</div>
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

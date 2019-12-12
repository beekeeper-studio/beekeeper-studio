<template>
  <nav class="list-group">
    <a
      href=""
      class="quick-connect"
      :class="{'active': defaultConfig == selectedConfig }"
      @click.prevent="edit(defaultConfig)"
    ><i class="material-icons">offline_bolt</i> Quick Connect</a>
    <h5>Saved Connections</h5>
    <a
      href=""
      v-for="c in connectionConfigs"
      :key="c.id"
      :class="{'active': c == selectedConfig }"
      @click.prevent="edit(c)"
    >{{c.name}} ({{c.connectionType}})</a>
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
      edit(connectionConfig) {
        this.$emit('edit', connectionConfig)
      },
      connect(connectionConfig) {

      }
    }
  }
</script>

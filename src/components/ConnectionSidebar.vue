<template>
  <nav class="list-group">
    <div class="btn-wrap">
      <a
        href=""
        class="quick-connect btn btn-primary btn-block btn-icon"
        :class="{'active': defaultConfig == selectedConfig }"
        @click.prevent="edit(defaultConfig)"
      ><i class="material-icons">offline_bolt</i>Quick Connect</a>
    </div>
    <h5>Saved Connections</h5>
    <a
      href=""
      v-for="c in connectionConfigs"
      :key="c.id"
      :class="{'active': c == selectedConfig }"
      @click.prevent="edit(c)"
      @dblclick.prevent="connect(c)"
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
      edit(config) {
        this.$emit('edit', config)
      },
      connect(config) {
        this.$emit('connect', config)
      }
    }
  }
</script>

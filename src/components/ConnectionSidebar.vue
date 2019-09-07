<template>
<div>
  <div id="sidebar-wrapper" class="bg-light border-right">
    <div class="list-group list-group-flush">
      <a
        href=""
        class="list-group-item list-group-item-action"
        :class="{'active': defaultConfig == selectedConfig }"
        @click.prevent="edit(defaultConfig)"
      ><i class="fas fa-bolt"></i> Quick Connect</a>
      <div class="list-group-item">
        <h5>Saved Connections</h5>
      </div>
      <a
        href=""
        v-for="c in connectionConfigs"
        :key="c.id"
        class="list-group-item list-group-item-action"
        :class="{'active': c == selectedConfig }"
        @click.prevent="edit(c)"
      >{{c.name}} ({{c.connectionType}})</a>
    </div>
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
      edit(connectionConfig) {
        this.$emit('edit', connectionConfig)
      },
      connect(connectionConfig) {

      }
    }
  }
</script>

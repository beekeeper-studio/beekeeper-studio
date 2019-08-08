<template>
<div class="connection-sidebar">
  <div id="sidebar-wrapper" class="bg-light border-right">
    <h5 class="p-3">Saved Connections</h5>
    <!-- <div class="sidbar-heading mt-2 p-3">Saved Connections</div> -->
    <div class="list-group list-group-flush">
      <div :key="c.id" v-for="c in connectionConfigs" class="list-group-item">
        {{c.name}} ({{c.connectionType}})
        <span class="float-right">CONNECT</span>
      </div>
    </div>
  </div>
</div>
</template>

<script>
  export default {
    computed: {
      connectionConfigs() {
        return this.$store.state.connectionConfigs
      }
    },
    methods: {
      edit(connectionConfig) {
        this.$emit('edit', connectionConfig)
      }
    }
  }
</script>

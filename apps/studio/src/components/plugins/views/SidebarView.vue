<template>
  <div class="sidebar-view">
    <iframe :src="src"></iframe>
  </div>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  name: "SidebarView",
  props: {
    pluginId: {
      type: String,
      required: true,
    },
    entryUrl: {
      type: String,
      required: true,
    },
  },
  computed: {
    src() {
      return `plugin://${this.pluginId}/${this.entryUrl}`;
    },
  }
});
</script>

<template>
  <div>Hello</div>
</template>
<script lang="ts">
import Vue from "vue";
import { AppEvent } from "@/common/AppEvent";

export default Vue.extend({
  computed: {
    rootBindings() {
      return [{ event: AppEvent.disconnect, handler: this.handleDisconnect }];
    },
  },
  methods: {
    handleDisconnect(options) {
      const reason = options?.reason
      if (!reason) {
        return
      }
      this.$noty.warning(`Disconnected: ${reason}`, {
        timeout: 5000
      })
    },
  },
  mounted() {
    this.registerHandlers(this.rootBindings);
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  },
});
</script>

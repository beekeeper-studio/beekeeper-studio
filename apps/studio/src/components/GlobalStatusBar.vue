<template>
  <div class="global-status-bar">
    <div
      class="connection-button-wrapper"
      :style="{
        ['--connection-button-icon-width']: connectionButtonIconWidth + 'px',
        width: connectionButtonWidth + 'px',
      }"
    >
      <connection-button />
    </div>
    <portal-target name="global-status-bar"></portal-target>
  </div>
</template>

<script>
import { PortalTarget } from "portal-vue";
import ConnectionButton from "./sidebar/core/ConnectionButton.vue";

export default {
  components: { PortalTarget, ConnectionButton },
  props: {
    connectionButtonWidth: Number,
    connectionButtonIconWidth: Number,
  },
};
</script>

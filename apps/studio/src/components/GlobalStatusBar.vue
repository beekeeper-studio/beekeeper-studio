<template>
  <div class="global-status-bar">
    <connection-button />
    <portal-target name="global-status-bar"></portal-target>
  </div>
</template>

<script>
import { PortalTarget } from 'portal-vue'
import ConnectionButton from './sidebar/core/ConnectionButton.vue'

export default {
  components: { PortalTarget, ConnectionButton },
}
</script>

<template>
  <div>
    <input-pin-modal />
    <create-pin-modal />
    <update-pin-modal />
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import _ from "lodash";
import { AppEvent } from "@/common/AppEvent";
import InputPinModal from "@/components/common/modals/InputPinModal.vue";
import CreatePinModal from "@/components/common/modals/CreatePinModal.vue";
import UpdatePinModal from "@/components/common/modals/UpdatePinModal.vue";

// capture: still observe input even if a handler stops propagation. passive: observe only.
const USER_ACTIVE_LISTENER_OPTS = { capture: true, passive: true };

type ThrottledReporter = (() => void) & { cancel(): void };

// Renderer-reported input backs up the main-process idle check, which is unreliable on Linux (#4144).
let reportUserActive: ThrottledReporter | null = null;

export default Vue.extend({
  components: { InputPinModal, CreatePinModal, UpdatePinModal },
  computed: {
    rootBindings() {
      return [{ event: AppEvent.disconnect, handler: this.handleDisconnect }];
    },
  },
  methods: {
    handleDisconnect(options) {
      const reason = options?.reason;
      if (!reason) {
        return;
      }
      this.$noty.warning(`Disconnected: ${reason}`, {
        timeout: 10000,
      });
    },
  },
  async mounted() {
    this.registerHandlers(this.rootBindings);
    const { security } = this.$bksConfig;
    if (security.disconnectOnIdle) {
      const handler = _.throttle(
        () => window.main.sendUserActive(),
        security.activityReportIntervalSeconds * 1000
      );
      reportUserActive = handler;
      security.activityEvents.forEach((event) =>
        window.addEventListener(event, handler, USER_ACTIVE_LISTENER_OPTS)
      );
    }
    if (security.lockMode === "pin") {
      const isLockSet = await this.$util.send("lock/isSet");
      if (!isLockSet) {
        this.$modal.show("create-pin-modal");
      }
    }
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
    if (reportUserActive) {
      const handler = reportUserActive;
      this.$bksConfig.security.activityEvents.forEach((event) =>
        window.removeEventListener(event, handler, USER_ACTIVE_LISTENER_OPTS)
      );
      handler.cancel();
      reportUserActive = null;
    }
  },
});
</script>

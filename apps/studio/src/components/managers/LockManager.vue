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

// powerMonitor's system idle time is unreliable on Linux, so when
// disconnect-on-idle is enabled we report real user input from the renderer
// to back up the idle detection in the main process. The send is throttled
// since the main process only needs coarse granularity.
const USER_ACTIVE_THROTTLE_MS = 5000;
const USER_ACTIVE_EVENTS = ["mousedown", "keydown"];
const USER_ACTIVE_LISTENER_OPTS = { capture: true, passive: true };

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
    reportUserActive: _.throttle(() => {
      window.main.sendUserActive();
    }, USER_ACTIVE_THROTTLE_MS),
  },
  async mounted() {
    this.registerHandlers(this.rootBindings);
    if (this.$bksConfig.security.disconnectOnIdle) {
      USER_ACTIVE_EVENTS.forEach((event) =>
        window.addEventListener(
          event,
          this.reportUserActive,
          USER_ACTIVE_LISTENER_OPTS
        )
      );
    }
    if (this.$bksConfig.security.lockMode === "pin") {
      const isLockSet = await this.$util.send("lock/isSet");
      if (!isLockSet) {
        this.$modal.show("create-pin-modal");
      }
    }
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
    USER_ACTIVE_EVENTS.forEach((event) =>
      window.removeEventListener(
        event,
        this.reportUserActive,
        USER_ACTIVE_LISTENER_OPTS
      )
    );
  },
});
</script>

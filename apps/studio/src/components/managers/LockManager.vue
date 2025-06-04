<template>
  <div>
    <input-pin-modal />
    <create-pin-modal />
    <update-pin-modal />
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import { AppEvent } from "@/common/AppEvent";
import InputPinModal from "@/components/common/modals/InputPinModal.vue";
import CreatePinModal from "@/components/common/modals/CreatePinModal.vue";
import UpdatePinModal from "@/components/common/modals/UpdatePinModal.vue";

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
    if (this.$bksConfig.security.lockMode === "pin") {
      const isLockSet = await this.$util.send("lock/isSet");
      if (!isLockSet) {
        this.$modal.show("create-pin-modal");
      }
    }
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  },
});
</script>

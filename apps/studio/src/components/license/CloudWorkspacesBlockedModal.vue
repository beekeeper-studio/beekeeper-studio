<template>
  <portal to="modals">
    <modal class="vue-dialog beekeeper-modal" :name="modalName">
      <div class="dialog-content">
        <div class="dialog-c-title">
          Cloud Workspaces require an active subscription
        </div>
        <div>
          <p>
            You have a lifetime license, but your subscription has ended. Cloud Workspaces are only available to active subscribers.
          </p>
          <p>
            Existing workspace data (saved queries and connections) can be
            exported from the account dashboard.
          </p>
        </div>
      </div>
      <div class="vue-dialog-buttons">
        <button class="btn btn-flat" type="button" @click.prevent="close">
          Close
        </button>
        <button class="btn btn-flat" type="button" @click.prevent="openDashboard">
          Open Dashboard
        </button>
        <button class="btn btn-primary" type="button" @click.prevent="renew">
          Buy License
        </button>
      </div>
    </modal>
  </portal>
</template>

<script lang="ts">
import { AppEvent } from "@/common/AppEvent";

export default {
  computed: {
    modalName: () => "cloud-workspaces-blocked-modal",
    rootBindings() {
      return [
        { event: AppEvent.cloudWorkspacesBlocked, handler: this.show },
      ];
    },
  },
  methods: {
    show() {
      this.$modal.show(this.modalName);
    },
    close() {
      this.$modal.hide(this.modalName);
    },
    openDashboard() {
      this.close();
      this.$native.openLink(this.$config.cloudUrl);
    },
    renew() {
      this.close();
      this.$native.openLink("https://www.beekeeperstudio.io/pricing");
    },
  },
  mounted() {
    this.registerHandlers(this.rootBindings);
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  },
};
</script>

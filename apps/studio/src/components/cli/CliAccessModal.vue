<template>
  <base-modal
    :name="modalName"
    :closable="false"
    first-focusable=".btn-danger"
    @before-close="handleBeforeClose"
  >
    <template #title> CLI access request </template>
    <div v-if="current" class="cli-access-request">
      <div class="cli-access-client">
        <i class="material-icons">smart_toy</i>
        <span class="cli-access-client-name">{{ current.clientName }}</span>
      </div>
      <p class="cli-access-summary">
        Requests access to <strong>{{ current.connectionName }}</strong
        >. Choose what it may do. Access lasts until the connection is closed.
      </p>
      <cli-access-form
        v-model="access"
        :read-only-mode="current.readOnlyMode"
      />
    </div>
    <template #footer>
      <button
        type="button"
        class="btn btn-flat"
        @click.prevent="deny"
      >
        Deny
      </button>
      <button type="button" class="btn btn-flat" @click.prevent="approve">
        Approve
      </button>
    </template>
  </base-modal>
</template>

<script lang="ts">
import Vue from "vue";
import BaseModal from "@/components/common/modals/BaseModal.vue";
import CliAccessForm from "./CliAccessForm.vue";
import { CliError } from "@beekeeperstudio/cli";
import type { Access } from "@beekeeperstudio/cli";
import type { ApprovalRequester } from "@beekeeperstudio/cli";

function defaultAccess(): Access {
  return {
    queryTypes: ["select"],
    savedQueriesRead: false,
    savedQueriesWrite: false,
    openTabs: false,
  };
}

/** Asks the user whether a CLI client may use this window's connection. */
export default Vue.extend({
  components: { BaseModal, CliAccessForm },
  data() {
    return {
      modalName: "cli-access-modal",
      requester: null as ApprovalRequester | null,
      access: defaultAccess(),
      denied: false,
      aborted: false,
      resolvers: null as PromiseWithResolvers<Access> | null,
    };
  },
  computed: {
    rpcMethods() {
      return [{ "cli/requestApproval": this.requestApproval }];
    },
  },
  methods: {
    requestApproval(
      params: ApprovalRequester,
      signal: AbortSignal,
    ): Promise<Access> {
      if (this.requester) {
        throw new Error(
          "Cannot request access while another request is pending",
        );
      }

      signal.addEventListener("abort", this.handleAbort, {
        once: true,
      });

      this.reset();
      this.requester = params;
      this.$modal.show(this.modalName);

      return this.resolvers.promise;
    },
    reset() {
      this.denied = false;
      this.aborted = false;
    },
    approve() {
      this.$modal.hide(this.modalName);
    },
    deny() {
      this.denied = true;
      this.$modal.hide(this.modalName);
    },
    handleAbort() {
    this.aborted = true;
      this.$modal.hide(this.modalName);
    },
    handleBeforeClose() {
      if (this.denied) {
        this.resolvers.reject(
          new CliError("ACCESS_DENIED", "Access was denied."),
        );
      } else if (this.aborted) {
        this.resolvers.reject(
          new DOMException("The request was cancelled.", "AbortError"),
        );
      } else {
        this.resolvers.resolve(this.access);
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.cli-access-client {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;

  .material-icons {
    font-size: 1.5rem;
  }
}

.cli-access-client-name {
  font-weight: 600;
}

.cli-access-summary {
  margin: 0 0 0.75rem;
}
</style>

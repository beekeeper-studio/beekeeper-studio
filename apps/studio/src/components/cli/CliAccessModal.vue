<template>
  <base-modal
    :name="modalName"
    :closable="false"
    first-focusable=".btn-danger"
    @closed="showNext"
  >
    <template #title>
      CLI access request
    </template>
    <div
      v-if="current"
      class="cli-access-request"
    >
      <div class="cli-access-client">
        <i class="material-icons">smart_toy</i>
        <span class="cli-access-client-name">{{ current.clientName }}</span>
      </div>
      <p class="cli-access-summary">
        Requests access to <strong>{{ current.connectionName }}</strong>.
        Choose what it may do. Access lasts until the connection is closed.
      </p>
      <cli-access-form
        v-model="access"
        :read-only-mode="current.readOnlyMode"
      />
    </div>
    <template #footer="{ close }">
      <button
        type="button"
        class="btn btn-primary btn-danger"
        @click.prevent="answer(false, close)"
      >
        Deny
      </button>
      <button
        type="button"
        class="btn btn-flat"
        @click.prevent="answer(true, close)"
      >
        Approve
      </button>
    </template>
  </base-modal>
</template>

<script lang="ts">
import Vue from "vue";
import BaseModal from "@/components/common/modals/BaseModal.vue";
import CliAccessForm from "./CliAccessForm.vue";
import type { CliAccess } from "@beekeeperstudio/cli-client";

interface AccessRequest {
  requestId: string;
  clientName: string;
  connectionName: string;
  readOnlyMode: boolean;
}

function defaultAccess(): CliAccess {
  return { queryTypes: ["select"], savedQueriesRead: false, savedQueriesWrite: false, openTabs: false };
}

/** Asks the user whether a CLI client may use this window's connection. */
export default Vue.extend({
  components: { BaseModal, CliAccessForm },
  data() {
    return {
      modalName: "cli-access-modal",
      queue: [] as AccessRequest[],
      current: null as AccessRequest | null,
      access: defaultAccess(),
      listenerIds: [] as string[],
    };
  },
  methods: {
    enqueue(request: AccessRequest) {
      this.queue.push(request);
      if (!this.current) {
        this.showNext();
      }
    },
    showNext() {
      this.current = this.queue.shift() ?? null;
      if (!this.current) {
        return;
      }
      this.access = defaultAccess();
      this.$modal.show(this.modalName);
    },
    async answer(approved: boolean, close: () => void) {
      const request = this.current;
      if (!request) {
        return;
      }
      const access = this.access;
      this.current = null;
      close();
      await this.respond(request, approved ? access : null);
    },
    cancel({ requestId }: { requestId: string }) {
      this.queue = this.queue.filter((request) => request.requestId !== requestId);
      if (this.current?.requestId === requestId) {
        this.current = null;
        this.$modal.hide(this.modalName);
      }
    },
    respond(request: AccessRequest, access: CliAccess | null) {
      return this.$util.send("cliServer/respond", {
        requestId: request.requestId,
        result: { access },
      });
    },
  },
  mounted() {
    this.listenerIds = [
      this.$util.addListener("cli/requestAccess", this.enqueue),
      this.$util.addListener("cli/cancelRequest", this.cancel),
    ];
  },
  beforeDestroy() {
    for (const id of this.listenerIds) {
      this.$util.removeListener(id);
    }
    // A closing window must not leave a bks command waiting forever.
    for (const request of [this.current, ...this.queue]) {
      if (request) {
        this.respond(request, null);
      }
    }
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

<template>
  <portal to="modals">
    <modal
      :name="modalName"
      class="vue-dialog beekeeper-modal ai-access-modal"
      height="auto"
      :click-to-close="false"
    >
      <div v-if="current" class="dialog-content ai-access-content">
        <div class="ai-access-head">
          <i class="material-icons">lock</i>
          <span>AI Server &middot; Access request</span>
        </div>
        <div class="ai-access-body">
          <div class="hero">
            <div class="glyph">
              <i class="material-icons">smart_toy</i>
            </div>
            <div class="copy">
              <div class="t">
                <b>{{ current.name }}</b> wants to connect to Beekeeper Studio
              </div>
              <div class="d">
                <code>{{ current.address || 'local' }}</code>
                <span class="sep">&middot;</span>
                <span class="ua">{{ current.userAgent }}</span>
              </div>
            </div>
          </div>

          <div class="explain">
            Approving lets this client reach your <b>allowed connections</b> and run
            queries through the AI server. {{ writeNote }} Access can be revoked any
            time from <b>AI Server &rarr; Overview</b>.
          </div>

          <div v-if="queued > 0" class="queued">
            {{ queued }} more request{{ queued === 1 ? '' : 's' }} waiting.
          </div>

          <div class="ai-access-actions">
            <button class="btn btn-ghost" :disabled="busy" @click="deny">
              Deny
            </button>
            <span class="spacer" />
            <button class="btn btn-primary" :disabled="busy" @click="approve">
              <i class="material-icons">check</i>Allow
            </button>
          </div>
        </div>
      </div>
    </modal>
  </portal>
</template>

<script lang="ts">
import Vue from "vue";
import { mapState } from "vuex";
import { AiServerAccessRequest, AiServerClient } from "@/common/interfaces/IAiServer";

export default Vue.extend({
  name: "AiServerAccessDialog",
  data() {
    return {
      modalName: "ai-server-access-dialog",
      busy: false,
      accessListenerId: null as string | null,
      clientsListenerId: null as string | null,
    };
  },
  computed: {
    ...mapState("aiServer", ["accessRequests", "options"]),
    current(): AiServerAccessRequest | null {
      return this.accessRequests[0] ?? null;
    },
    queued(): number {
      return Math.max(0, this.accessRequests.length - 1);
    },
    writeNote(): string {
      return this.options.allowWrites
        ? "Write and DDL statements are currently allowed."
        : "The connection stays read-only.";
    },
  },
  watch: {
    current(next: AiServerAccessRequest | null) {
      if (next) this.$modal.show(this.modalName);
      else this.$modal.hide(this.modalName);
    },
  },
  mounted() {
    this.accessListenerId = this.$util.addListener(
      "aiServerAccessRequest",
      (request: AiServerAccessRequest) => {
        this.$store.dispatch("aiServer/receiveAccessRequest", request);
      }
    );
    this.clientsListenerId = this.$util.addListener(
      "aiServerClientsChanged",
      (clients: AiServerClient[]) => {
        this.$store.dispatch("aiServer/receiveClientsPush", clients);
      }
    );
  },
  beforeDestroy() {
    if (this.accessListenerId) this.$util.removeListener(this.accessListenerId);
    if (this.clientsListenerId) this.$util.removeListener(this.clientsListenerId);
  },
  methods: {
    async approve() {
      if (!this.current) return;
      this.busy = true;
      try {
        await this.$store.dispatch("aiServer/approveClient", this.current.id);
      } catch (e: any) {
        this.$noty.error(`Could not approve client: ${e.message}`);
      } finally {
        this.busy = false;
      }
    },
    async deny() {
      if (!this.current) return;
      this.busy = true;
      try {
        await this.$store.dispatch("aiServer/denyClient", this.current.id);
      } catch (e: any) {
        this.$noty.error(`Could not deny client: ${e.message}`);
      } finally {
        this.busy = false;
      }
    },
  },
});
</script>

<style lang="scss" scoped>
// Scoped — selectors are rewritten with a data attribute and cannot bleed.
::v-deep(.v--modal.ai-access-modal),
::v-deep(.ai-access-modal .v--modal) {
  width: min(30rem, 92vw) !important;
  max-width: min(30rem, 92vw) !important;
}

.ai-access-content {
  display: flex;
  flex-direction: column;
}

.ai-access-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0.85rem 1.1rem;
  border-bottom: 1px solid var(--bks-border-color, var(--border-color, rgba(255, 255, 255, 0.1)));
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--bks-text-dark, var(--text));
  background: linear-gradient(180deg, rgba(250, 216, 59, 0.08), transparent);

  .material-icons {
    font-size: 16px;
    color: var(--bks-brand-primary, var(--theme-primary, #fad83b));
  }
}

.ai-access-body {
  padding: 1.1rem;
}

.hero {
  display: flex;
  gap: 0.85rem;
  align-items: flex-start;
  padding-bottom: 0.9rem;
  border-bottom: 1px solid var(--bks-border-color, var(--border-color, rgba(255, 255, 255, 0.1)));

  .glyph {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(250, 216, 59, 0.12);

    .material-icons {
      font-size: 24px;
      color: var(--bks-brand-primary, var(--theme-primary, #fad83b));
    }
  }
  .copy { flex: 1; min-width: 0; padding-top: 1px; }
  .t {
    font-size: 0.92rem;
    color: var(--bks-text-dark, var(--text));
    line-height: 1.35;
  }
  .t b { font-weight: 600; }
  .d {
    font-size: 0.72rem;
    color: var(--bks-text-lighter, var(--text-light));
    margin-top: 6px;
    font-family: monospace;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px;
  }
  .d .sep { opacity: 0.5; }
  .d .ua { word-break: break-all; }
}

.explain {
  font-size: 0.78rem;
  color: var(--bks-text-light, var(--text-light));
  line-height: 1.55;
  padding: 0.9rem 0;

  b { color: var(--bks-text-dark, var(--text)); font-weight: 500; }
}

.queued {
  font-size: 0.72rem;
  color: var(--bks-text-lighter, var(--text-light));
  margin-bottom: 0.6rem;
}

.ai-access-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  .spacer { flex: 1; }
}

// Buttons — scoped, won't touch the app's global .btn.
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 16px;
  border-radius: 6px;
  border: 1px solid var(--bks-border-color, var(--border-color, rgba(255, 255, 255, 0.1)));
  background: rgba(255, 255, 255, 0.04);
  color: var(--bks-text-dark, var(--text));
  font: inherit;
  font-size: 0.82rem;
  cursor: pointer;

  &:hover:not(:disabled) { background: rgba(255, 255, 255, 0.08); }
  &:disabled { opacity: 0.55; cursor: not-allowed; }
  .material-icons { font-size: 15px; }
}
.btn-ghost {
  background: transparent;
  border-color: transparent;
  color: var(--bks-text-light, var(--text-light));
}
.btn-ghost:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.05);
  color: var(--bks-text-dark, var(--text));
}
.btn-primary {
  background: var(--bks-brand-primary, var(--theme-primary));
  color: rgba(0, 0, 0, 0.87);
  border-color: var(--bks-brand-primary, var(--theme-primary));
  font-weight: 500;
}
.btn-primary:hover:not(:disabled) { filter: brightness(0.95); }
</style>

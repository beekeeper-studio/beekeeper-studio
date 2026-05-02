<template>
  <a
    v-if="visible"
    href="#"
    @click.prevent="open"
    @contextmenu.prevent="open"
    class="nav-item selectable ai-server-status-btn"
    :class="{ 'is-running': running }"
    v-tooltip.right-end="tooltip"
  >
    <span class="material-icons icon">smart_toy</span>
  </a>
</template>

<script lang="ts">
import Vue from "vue";
import { mapState } from "vuex";
import { AppEvent } from "@/common/AppEvent";
import { AiServerLogEntry, AiServerStatusWithToken } from "@/common/interfaces/IAiServer";

export default Vue.extend({
  name: "AiServerStatusButton",
  data() {
    return {
      logListenerId: null as string | null,
      statusListenerId: null as string | null,
    };
  },
  computed: {
    ...mapState("aiServer", { status: "status" }),
    visible(): boolean {
      // The store's initial status has configDisabled=true; once we hit refreshStatus
      // (which we do on mount) we'll get the real value. Hide if disabled by config.
      return !this.status.configDisabled;
    },
    running(): boolean {
      return !!this.status.running;
    },
    tooltip(): string {
      return this.running
        ? `AI server running on ${this.status.host}:${this.status.port}`
        : "AI server stopped — click to open settings";
    },
  },
  async mounted() {
    try {
      await this.$store.dispatch("aiServer/refreshStatus");
    } catch {
      // server may not be reachable yet (e.g. utility process still booting)
    }
    this.statusListenerId = this.$util.addListener(
      "aiServerStatusChanged",
      (status: AiServerStatusWithToken) => {
        this.$store.dispatch("aiServer/receiveStatusPush", status);
      }
    );
    this.logListenerId = this.$util.addListener(
      "aiServerLogAppend",
      (entry: AiServerLogEntry) => {
        this.$store.dispatch("aiServer/receiveLogPush", entry);
      }
    );
  },
  beforeDestroy() {
    if (this.statusListenerId) this.$util.removeListener(this.statusListenerId);
    if (this.logListenerId) this.$util.removeListener(this.logListenerId);
  },
  methods: {
    open() {
      this.$root.$emit(AppEvent.openAiServerPanel);
    },
  },
});
</script>

<style lang="scss" scoped>
.ai-server-status-btn {
  // Inherit nav-item shape from the surrounding sidebar; only style the icon state.
  .icon {
    transition: color 0.2s ease, opacity 1.2s ease-in-out;
  }
  &.is-running .icon {
    color: var(--bks-theme-base, var(--theme-primary, #5e94e6));
    animation: ai-server-pulse 2.4s ease-in-out infinite;
  }
}

@keyframes ai-server-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>

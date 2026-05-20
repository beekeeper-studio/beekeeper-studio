<template>
  <a
    v-if="visible"
    href="#"
    @click.prevent="open"
    @contextmenu.prevent="open"
    class="nav-item selectable ai-server-status-btn"
    :class="{ 'is-running': running, 'is-stopped': !running }"
    v-tooltip.right-end="tooltip"
  >
    <span class="ai-indicator" :class="{ running, stopped: !running }">
      <span class="ai-hex">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect class="fill" x="6" y="6" width="88" height="88" rx="16" ry="16" />
          <g class="glyph">
            <path d="M58 12 L28 56 L46 56 L40 88 L72 42 L52 42 L58 12 Z" />
          </g>
        </svg>
      </span>
      <span v-if="running" class="ai-dot" />
    </span>
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
// Scoped: every selector below is rewritten by Vue with a data attribute,
// so .ai-indicator, .ai-hex etc. cannot collide with other components.
.ai-server-status-btn {
  // Keep the surrounding .nav-item geometry from the global sidebar — only
  // replace the inner icon with the AI-server chip.
  .ai-indicator {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: relative;
    flex-shrink: 0;
  }

  .ai-hex {
    width: 20px;
    height: 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .ai-hex svg {
    display: block;
    width: 100%;
    height: 100%;
  }

  // Running — yellow chip, dark glyph
  .ai-indicator.running .ai-hex svg .fill {
    fill: var(--bks-brand-primary, #fad83b);
  }
  .ai-indicator.running .ai-hex svg .glyph path {
    fill: rgba(0, 0, 0, 0.85);
  }

  // Stopped — soft chip, light glyph
  .ai-indicator.stopped .ai-hex svg .fill {
    fill: rgba(255, 255, 255, 0.08);
  }
  .ai-indicator.stopped .ai-hex svg .glyph path {
    fill: var(--bks-text-light, rgba(255, 255, 255, 0.57));
  }

  // Status dot — bottom-right corner, pulsing
  .ai-dot {
    position: absolute;
    bottom: -1px;
    right: -1px;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--bks-brand-success, #15db95);
    border: 2px solid var(--bks-global-sidebar-bg, var(--bks-theme-bg, #181818));
    box-shadow: 0 0 0 0 rgba(21, 219, 149, 0.5);
    animation: ai-status-pulse 2.4s ease-in-out infinite;
  }
}

@keyframes ai-status-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(21, 219, 149, 0.45); }
  50%      { box-shadow: 0 0 0 5px rgba(21, 219, 149, 0); }
}
</style>

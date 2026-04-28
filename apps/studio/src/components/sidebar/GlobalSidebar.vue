<template>
  <div class="global-items">
    <a
      href=""
      @click.prevent="$emit('select', 'tables')"
      class="nav-item selectable"
      :class="{ active: activeItem === 'tables'}"
      title="Database"
    >
      <span class="bk-database" />
    </a>
    <a
      href=""
      @click.prevent="$emit('select', 'queries')"
      class="nav-item selectable"
      :class="{ active: activeItem === 'queries'}"
      title="Saved Queries"
    >
      <span class="material-icons">code</span>
    </a>
    <a
      href=""
      @click.prevent="$emit('select', 'history')"
      class="nav-item selectable"
      :class="{ active: activeItem === 'history'}"
      title="Run History"
    >
      <span class="material-icons">history</span>
    </a>
    <span class="expand" />
    <a
      v-if="aiServerVisible"
      href=""
      @click.prevent="openAiServer"
      class="nav-item selectable ai-server-indicator"
      :class="{ running: aiServerRunning }"
      :title="aiServerTooltip"
    >
      <span class="material-icons">smart_toy</span>
      <span class="status-dot" />
    </a>
    <core-account-button v-if="$store.state.workspaceId > 0" />
  </div>
</template>

<script>
  import { mapState } from 'vuex'
  import { AppEvent } from '@/common/AppEvent'
  import CoreAccountButton from './core/CoreAccountButton.vue'
  export default {
    props: ['activeItem'],
    components: { CoreAccountButton },
    computed: {
      ...mapState('aiServer', { aiServerStatus: 'status' }),
      aiServerVisible() {
        return !this.aiServerStatus.configDisabled
      },
      aiServerRunning() {
        return !!this.aiServerStatus.running
      },
      aiServerTooltip() {
        return this.aiServerRunning
          ? `AI server running on ${this.aiServerStatus.host}:${this.aiServerStatus.port}`
          : 'AI server stopped — click to open settings'
      },
    },
    mounted() {
      // Pull initial status; the modal also subscribes to live pushes via $util.
      this.$store.dispatch('aiServer/refreshStatus').catch(() => undefined)
    },
    methods: {
      openAiServer() {
        this.$root.$emit(AppEvent.openAiServerPanel)
      },
    },
  }
</script>

<style scoped>
.ai-server-indicator { position: relative; }
.ai-server-indicator .status-dot {
  position: absolute;
  bottom: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(160, 160, 160, .6);
  border: 1.5px solid var(--global-sidebar-bg, transparent);
  box-sizing: content-box;
}
.ai-server-indicator.running .status-dot {
  background: #2ecc71;
  box-shadow: 0 0 6px rgba(46, 204, 113, .7);
}
</style>

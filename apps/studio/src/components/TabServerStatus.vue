<template>
  <div class="server-status tab-server-status">
    <div class="server-status-actions">
      <x-button @click="refresh" :disabled="loading">
        <i class="material-icons">refresh</i>
        Refresh
      </x-button>
      <label class="auto-refresh-toggle">
        <input type="checkbox" v-model="autoRefresh" />
        Auto refresh (5s)
      </label>
      <span class="muted" v-if="lastUpdated">Updated {{ lastUpdated }}</span>
    </div>

    <div v-if="error" class="server-status-error">
      {{ error }}
    </div>

    <div v-if="stats" class="server-status-grid">
      <div class="server-status-card">
        <h4>Performance</h4>
        <ul>
          <li><strong>Connections:</strong> {{ stats.performance.connections }}</li>
          <li><strong>Uptime:</strong> {{ formatUptime(stats.performance.uptime) }}</li>
          <li><strong>Threads running:</strong> {{ stats.performance.threadsRunning }}</li>
          <li><strong>Threads connected:</strong> {{ stats.performance.threadsConnected }}</li>
          <li><strong>Slow queries:</strong> {{ stats.performance.slowQueries }}</li>
          <li><strong>Questions / second:</strong> {{ stats.performance.questionsPerSecond }}</li>
        </ul>
      </div>

      <div class="server-status-card">
        <h4>Memory / Buffers</h4>
        <ul>
          <li><strong>Key buffer size:</strong> {{ formatBytes(stats.memory.keyBufferSize) }}</li>
          <li><strong>InnoDB buffer pool size:</strong> {{ formatBytes(stats.memory.innodbBufferPoolSize) }}</li>
          <li><strong>InnoDB buffer pool used:</strong> {{ formatBytes(stats.memory.innodbBufferPoolUsed) }}</li>
        </ul>
      </div>

      <div class="server-status-card">
        <h4>Query Cache</h4>
        <ul>
          <li><strong>Cache size:</strong> {{ formatBytes(stats.queryCache.size) }}</li>
          <li><strong>Cache limit:</strong> {{ formatBytes(stats.queryCache.limit) }}</li>
          <li><strong>Hits:</strong> {{ stats.queryCache.hits }}</li>
          <li><strong>Inserts:</strong> {{ stats.queryCache.inserts }}</li>
          <li><strong>Low memory prunes:</strong> {{ stats.queryCache.lowMemoryPrunes }}</li>
        </ul>
      </div>

      <div class="server-status-card">
        <h4>System Notes</h4>
        <ul>
          <li>CPU / RAM / Swap metrics are available in some MySQL setups via status variables and plugins.</li>
          <li>This panel reads metrics from <code>SHOW GLOBAL STATUS</code> and <code>SHOW GLOBAL VARIABLES</code>.</li>
        </ul>
      </div>
    </div>

    <div v-else-if="!loading" class="muted">
      No server statistics available for this connection.
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { mapState } from 'vuex';
import { ServerStatistics } from '@/lib/db/models';

export default Vue.extend({
  props: ['active', 'tab', 'tabId'],
  data() {
    return {
      loading: false,
      error: null as string | null,
      stats: null as ServerStatistics | null,
      autoRefresh: true,
      refreshTimer: null as ReturnType<typeof setInterval> | null,
      lastUpdated: null as string | null,
    };
  },
  computed: {
    ...mapState(['connection']),
  },
  watch: {
    active(value: boolean) {
      if (value) {
        this.startAutoRefresh();
        this.refresh();
      } else {
        this.stopAutoRefresh();
      }
    },
    autoRefresh() {
      if (this.active) this.startAutoRefresh();
    },
  },
  mounted() {
    if (this.active) {
      this.startAutoRefresh();
      this.refresh();
    }
  },
  beforeDestroy() {
    this.stopAutoRefresh();
  },
  methods: {
    startAutoRefresh() {
      this.stopAutoRefresh();
      if (!this.autoRefresh) return;
      this.refreshTimer = setInterval(() => {
        if (this.active) this.refresh();
      }, 5000);
    },
    stopAutoRefresh() {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
        this.refreshTimer = null;
      }
    },
    async refresh() {
      if (this.loading) return;
      this.loading = true;
      this.error = null;
      try {
        this.stats = await this.connection.getServerStatistics();
        this.lastUpdated = new Date().toLocaleTimeString();
      } catch (e) {
        this.error = e?.message || 'Failed to fetch server statistics';
      } finally {
        this.loading = false;
      }
    },
    formatUptime(seconds: number) {
      if (!seconds || Number.isNaN(seconds)) return '0s';
      const d = Math.floor(seconds / 86400);
      const h = Math.floor((seconds % 86400) / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      const parts = [];
      if (d) parts.push(`${d}d`);
      if (h) parts.push(`${h}h`);
      if (m) parts.push(`${m}m`);
      if (s || !parts.length) parts.push(`${s}s`);
      return parts.join(' ');
    },
    formatBytes(value: string | number) {
      const n = typeof value === 'string' ? parseInt(value, 10) : value;
      if (!n || Number.isNaN(n)) return '0 B';
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      let size = n;
      let unit = 0;
      while (size >= 1024 && unit < units.length - 1) {
        size /= 1024;
        unit += 1;
      }
      return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unit]}`;
    },
  },
});
</script>

<style lang="scss" scoped>
.tab-server-status {
  padding: 16px;
  overflow: auto;
}

.server-status-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.auto-refresh-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.server-status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}

.server-status-card {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;

  h4 {
    margin: 0 0 8px;
  }

  ul {
    margin: 0;
    padding-left: 18px;
  }

  li {
    margin: 4px 0;
  }
}

.server-status-error {
  color: var(--theme-danger);
  margin-bottom: 12px;
}

.muted {
  opacity: 0.8;
}
</style>

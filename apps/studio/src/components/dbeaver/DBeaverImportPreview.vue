<template>
  <div class="dbeaver-import-preview">
    <!-- Connections -->
    <div class="section" v-if="connections.length > 0">
      <div class="section-header flex flex-between">
        <h4>Connections ({{ selectedConnections.length }}/{{ supportedConnections.length }})</h4>
        <a href="#" @click.prevent="toggleAllConnections" class="text-primary">
          {{ allConnectionsSelected ? 'Deselect All' : 'Select All' }}
        </a>
      </div>
      <div class="item-list">
        <label
          v-for="conn in connections"
          :key="conn.dbeaverId"
          class="import-item"
          :class="{ disabled: conn.connectionType === null }"
        >
          <input
            type="checkbox"
            :value="conn.dbeaverId"
            v-model="selectedConnectionIds"
            :disabled="conn.connectionType === null"
            @change="$emit('change')"
          >
          <div class="item-info">
            <div class="item-name">
              {{ conn.name }}
              <span v-if="conn.connectionType === null" class="badge badge-warning">
                Unsupported ({{ conn.unsupportedDriver }})
              </span>
            </div>
            <div class="item-details text-muted">
              <span v-if="conn.connectionType" class="badge">{{ conn.connectionType }}</span>
              <span v-if="conn.host">{{ conn.host }}{{ conn.port ? ':' + conn.port : '' }}</span>
              <span v-if="conn.defaultDatabase"> / {{ conn.defaultDatabase }}</span>
            </div>
          </div>
        </label>
      </div>
    </div>

    <!-- Queries -->
    <div class="section" v-if="queries.length > 0">
      <div class="section-header flex flex-between">
        <h4>Saved Queries ({{ selectedQueryIndices.length }}/{{ queries.length }})</h4>
        <a href="#" @click.prevent="toggleAllQueries" class="text-primary">
          {{ allQueriesSelected ? 'Deselect All' : 'Select All' }}
        </a>
      </div>
      <div class="item-list">
        <label
          v-for="(query, index) in queries"
          :key="index"
          class="import-item"
        >
          <input
            type="checkbox"
            :value="index"
            v-model="selectedQueryIndices"
            @change="$emit('change')"
          >
          <div class="item-info">
            <div class="item-name">{{ query.title }}</div>
            <div class="item-details text-muted">{{ query.text.substring(0, 100) }}{{ query.text.length > 100 ? '...' : '' }}</div>
          </div>
        </label>
      </div>
    </div>

    <div v-if="connections.length === 0 && queries.length === 0" class="empty-state pad">
      <p>No connections or queries found in this DBeaver installation.</p>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { ParsedConnection, ParsedQuery } from '@/lib/dbeaver/types'

export default Vue.extend({
  props: {
    stepperProps: { type: Object, default: () => ({}) },
  },
  data() {
    return {
      selectedConnectionIds: [] as string[],
      selectedQueryIndices: [] as number[],
    }
  },
  computed: {
    connections(): ParsedConnection[] {
      return this.stepperProps.connections || []
    },
    queries(): ParsedQuery[] {
      return this.stepperProps.queries || []
    },
    supportedConnections(): ParsedConnection[] {
      return this.connections.filter(c => c.connectionType !== null)
    },
    selectedConnections(): ParsedConnection[] {
      return this.connections.filter(c => this.selectedConnectionIds.includes(c.dbeaverId))
    },
    allConnectionsSelected(): boolean {
      return this.supportedConnections.length > 0 &&
        this.supportedConnections.every(c => this.selectedConnectionIds.includes(c.dbeaverId))
    },
    allQueriesSelected(): boolean {
      return this.queries.length > 0 &&
        this.selectedQueryIndices.length === this.queries.length
    },
  },
  methods: {
    canContinue(): boolean {
      return this.selectedConnectionIds.length > 0 || this.selectedQueryIndices.length > 0
    },
    onNext(): void {
      this.stepperProps.selectedConnections = this.selectedConnections
      this.stepperProps.selectedQueries = this.selectedQueryIndices.map(i => this.queries[i])
    },
    toggleAllConnections(): void {
      if (this.allConnectionsSelected) {
        this.selectedConnectionIds = []
      } else {
        this.selectedConnectionIds = this.supportedConnections.map(c => c.dbeaverId)
      }
      this.$emit('change')
    },
    toggleAllQueries(): void {
      if (this.allQueriesSelected) {
        this.selectedQueryIndices = []
      } else {
        this.selectedQueryIndices = this.queries.map((_, i) => i)
      }
      this.$emit('change')
    },
    onFocus(): void {
      this.selectedConnectionIds = this.supportedConnections.map(c => c.dbeaverId)
      this.selectedQueryIndices = this.queries.map((_, i) => i)
      this.$emit('change')
    },
  },
})
</script>

<style lang="scss" scoped>
.dbeaver-import-preview {
  padding: 8px;
  max-height: 400px;
  overflow-y: auto;
}
.section {
  margin-bottom: 16px;
}
.section-header {
  padding: 4px 12px;
  align-items: center;
  h4 { margin: 0; }
}
.item-list {
  max-height: 200px;
  overflow-y: auto;
}
.import-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  &:hover {
    background: var(--theme-bg-1);
  }
  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  input[type="checkbox"] {
    margin-top: 4px;
  }
}
.item-name {
  font-weight: 500;
}
.item-details {
  font-size: 0.85em;
}
.badge {
  font-size: 0.75em;
  padding: 2px 6px;
  border-radius: 3px;
  background: var(--theme-bg-2);
  margin-right: 4px;
}
.badge-warning {
  background: var(--theme-warning);
  color: var(--theme-text-dark);
}
.pad {
  padding: 12px;
}
</style>

<template>
  <div class="dbeaver-source-select">
    <div v-if="loading" class="text-center pad">
      <i class="material-icons spin">refresh</i>
      <span>Searching for DBeaver installations...</span>
    </div>

    <div v-else-if="installations.length === 0 && !manualPath" class="empty-state pad">
      <p>No DBeaver installations found in the default locations.</p>
      <button class="btn btn-primary" @click="browseManual">
        <i class="material-icons">folder_open</i>
        Browse for DBeaver config directory
      </button>
    </div>

    <div v-else>
      <div class="list-group" v-if="installations.length > 0">
        <label
          v-for="(inst, index) in installations"
          :key="index"
          class="dbeaver-source-item"
          :class="{ selected: selectedIndex === index }"
        >
          <input
            type="radio"
            :value="index"
            v-model="selectedIndex"
            @change="$emit('change')"
          >
          <div class="source-info">
            <div class="source-name">DBeaver {{ inst.edition }}</div>
            <div class="source-path text-muted">{{ inst.path }}</div>
            <div class="source-meta text-muted">
              <span v-if="inst.hasDataSources">Connections</span>
              <span v-if="inst.hasDataSources && inst.hasScripts"> &middot; </span>
              <span v-if="inst.hasScripts">Scripts</span>
            </div>
          </div>
        </label>
      </div>

      <div class="manual-browse pad" v-if="!manualPath">
        <a href="#" @click.prevent="browseManual" class="text-primary">
          Or browse for a different DBeaver directory...
        </a>
      </div>

      <div v-if="manualPath" class="manual-selected pad">
        <label class="dbeaver-source-item" :class="{ selected: selectedIndex === -1 }">
          <input type="radio" :value="-1" v-model="selectedIndex" @change="$emit('change')">
          <div class="source-info">
            <div class="source-name">Custom location</div>
            <div class="source-path text-muted">{{ manualPath }}</div>
          </div>
        </label>
      </div>
    </div>

    <div v-if="parseError" class="alert alert-danger margin">
      {{ parseError }}
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { DBeaverInstallation } from '@/lib/dbeaver/types'

export default Vue.extend({
  props: {
    stepperProps: { type: Object, default: () => ({}) },
  },
  data() {
    return {
      loading: true,
      installations: [] as DBeaverInstallation[],
      selectedIndex: null as number | null,
      manualPath: null as string | null,
      parseError: null as string | null,
    }
  },
  methods: {
    canContinue(): boolean {
      return this.selectedIndex !== null
    },
    async onNext(): Promise<void> {
      this.parseError = null
      const selectedPath = this.selectedIndex === -1
        ? this.manualPath
        : this.installations[this.selectedIndex!]?.path

      if (!selectedPath) return

      try {
        const result = await (this as any).$util.send('dbeaver/parse', { path: selectedPath })
        this.stepperProps.connections = result.connections
        this.stepperProps.queries = result.queries
      } catch (err: any) {
        this.parseError = `Failed to parse DBeaver configuration: ${err.message || err}`
        throw err
      }
    },
    browseManual(): void {
      const result = (this as any).$native.dialog.showOpenDialogSync({
        properties: ['openDirectory'],
        title: 'Select DBeaver .dbeaver config directory',
      })
      if (result && result.length > 0) {
        this.manualPath = result[0]
        this.selectedIndex = -1
        this.$emit('change')
      }
    },
  },
  async mounted() {
    try {
      this.installations = await (this as any).$util.send('dbeaver/detect')
      if (this.installations.length === 1) {
        this.selectedIndex = 0
      }
    } catch (err) {
      // Detection failed — user can browse manually
    } finally {
      this.loading = false
    }
    this.$emit('change')
  },
})
</script>

<style lang="scss" scoped>
.dbeaver-source-select {
  padding: 8px;
}
.dbeaver-source-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 4px;
  cursor: pointer;
  &:hover, &.selected {
    background: var(--theme-bg-1);
  }
  input[type="radio"] {
    margin-top: 4px;
  }
}
.source-name {
  font-weight: 600;
}
.source-path {
  font-size: 0.85em;
  word-break: break-all;
}
.source-meta {
  font-size: 0.8em;
}
.pad {
  padding: 12px;
}
.margin {
  margin: 12px;
}
</style>

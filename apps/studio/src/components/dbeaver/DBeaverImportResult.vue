<template>
  <div class="dbeaver-import-result">
    <div v-if="importing" class="text-center pad">
      <i class="material-icons spin">refresh</i>
      <p>Importing connections and queries...</p>
    </div>

    <div v-else-if="result" class="result-content pad">
      <div class="success-icon text-center" v-if="result.errors.length === 0">
        <i class="material-icons success-check">check_circle</i>
      </div>
      <div class="success-icon text-center" v-else>
        <i class="material-icons warning-check">warning</i>
      </div>

      <div class="result-summary text-center">
        <p v-if="result.importedConnections > 0">
          Imported <strong>{{ result.importedConnections }}</strong> connection{{ result.importedConnections !== 1 ? 's' : '' }}
        </p>
        <p v-if="result.importedQueries > 0">
          Imported <strong>{{ result.importedQueries }}</strong> saved quer{{ result.importedQueries !== 1 ? 'ies' : 'y' }}
        </p>
        <p v-if="result.importedConnections === 0 && result.importedQueries === 0">
          No items were imported.
        </p>
      </div>

      <div v-if="result.errors.length > 0" class="result-errors">
        <h4>Notes</h4>
        <ul>
          <li v-for="(error, index) in result.errors" :key="index" class="text-muted">
            {{ error }}
          </li>
        </ul>
      </div>
    </div>

    <div v-if="importError" class="alert alert-danger margin">
      {{ importError }}
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { ImportResult } from '@/lib/dbeaver/types'

export default Vue.extend({
  props: {
    stepperProps: { type: Object, default: () => ({}) },
  },
  data() {
    return {
      importing: false,
      result: null as ImportResult | null,
      importError: null as string | null,
    }
  },
  methods: {
    canContinue(): boolean {
      return !this.importing && this.result !== null
    },
    async onFocus(): Promise<void> {
      // Guard against re-import if user navigates back and forward
      if (this.result) return

      this.importing = true
      this.importError = null

      try {
        this.result = await (this as any).$util.send('dbeaver/import', {
          connections: this.stepperProps.selectedConnections || [],
          queries: this.stepperProps.selectedQueries || [],
        })

        // Refresh the connection sidebar
        this.$store.dispatch('data/connections/load')
      } catch (err: any) {
        this.importError = `Import failed: ${err.message || err}`
      } finally {
        this.importing = false
        this.$emit('change')
      }
    },
  },
})
</script>

<style lang="scss" scoped>
.dbeaver-import-result {
  padding: 8px;
}
.pad {
  padding: 12px;
}
.margin {
  margin: 12px;
}
.success-check {
  font-size: 48px;
  color: var(--theme-primary);
}
.warning-check {
  font-size: 48px;
  color: var(--theme-warning);
}
.result-summary {
  margin: 12px 0;
  p { margin: 4px 0; }
}
.result-errors {
  margin-top: 16px;
  h4 { margin-bottom: 8px; }
  ul {
    list-style: disc;
    padding-left: 20px;
    li {
      margin-bottom: 4px;
      font-size: 0.9em;
    }
  }
}
</style>

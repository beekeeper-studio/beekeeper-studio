<template>
  <div class="um-preview-card" :class="`um-preview-${feature.id}`">
    <template v-if="feature.id === 'workspaces'">
      <div class="um-preview-eyebrow">Workspaces</div>
      <div class="um-rows">
        <div class="um-row">
          <i class="material-icons" :style="{ color: feature.color }">cloud</i>
          Team · Acme Inc <span class="muted-xs">· 12 members</span>
        </div>
        <div class="um-row indent">
          <i class="material-icons muted-icon">folder</i>
          <span class="muted">shared queries</span>
        </div>
        <div class="um-row">
          <i class="material-icons muted-icon-light">person</i>
          Personal <span class="muted-xs">· you</span>
        </div>
      </div>
    </template>

    <template v-else-if="feature.id === 'ai'">
      <div class="um-rows mono">
        <div><span class="um-ai-prompt">&gt;</span> top customers by revenue last quarter</div>
        <div class="muted">I'll check the schema for orders and customers first.</div>
        <div :style="{ color: feature.color }">SELECT c.name, SUM(o.total) AS revenue</div>
        <div :style="{ color: feature.color }">FROM customers c JOIN orders o ON o.customer_id = c.id</div>
        <div class="muted-xs">-- Run this query? [y/n]</div>
      </div>
    </template>

    <template v-else-if="feature.id === 'enterprise'">
      <div class="um-preview-eyebrow">Authentication</div>
      <div class="um-rows mono compact">
        <div><span class="um-ai-ok">$</span> aws sso login --profile prod</div>
        <div class="um-ok-row">
          <i class="material-icons">check_circle</i>
          Authenticated as alice@company.com
        </div>
        <div class="sans">
          → Connecting to <span class="link">rds-prod.us-east-1</span>
          <span class="muted-xs"> · no password required</span>
        </div>
      </div>
      <div class="um-chips">
        <span v-for="db in dbChips" :key="db">{{ db }}</span>
      </div>
    </template>

    <template v-else-if="feature.id === 'json'">
      <div class="um-preview-eyebrow">JSON Sidebar · row 1247</div>
      <pre class="um-json">{{ jsonSample }}</pre>
    </template>

    <template v-else-if="feature.id === 'editable'">
      <div class="um-editable-table">
        <div class="um-editable-header">id</div>
        <div class="um-editable-header">name</div>
        <div class="um-editable-header">plan</div>
        <div class="um-editable-header">updated_at</div>

        <div class="um-cell num">12</div>
        <div class="um-cell strong">Acme Inc</div>
        <div class="um-cell um-cell-editing" :style="{ boxShadow: `inset 0 0 0 1.5px ${feature.color}` }">
          professional<span class="um-pencil">✎</span>
        </div>
        <div class="um-cell muted">2024-08-12</div>

        <div class="um-cell num">13</div>
        <div class="um-cell strong">Globex Corp</div>
        <div class="um-cell strong">indie</div>
        <div class="um-cell muted">2024-08-09</div>
      </div>
      <div class="um-staged">
        <i class="material-icons" :style="{ color: feature.color }">edit</i>
        1 staged change · <span class="muted">customers.plan</span>
        <span class="um-apply">Apply</span>
      </div>
    </template>

    <template v-else-if="feature.id === 'io'">
      <div class="um-rows">
        <div class="um-row">
          <i class="material-icons ok">check_box</i>customers <span class="muted-xs">· 412 KB</span>
        </div>
        <div class="um-row">
          <i class="material-icons ok">check_box</i>orders <span class="muted-xs">· 2.1 MB</span>
        </div>
        <div class="um-row">
          <i class="material-icons ok">check_box</i>line_items <span class="muted-xs">· 8.4 MB</span>
        </div>
        <div class="muted-xs um-export-note">
          Export 3 tables → <span :style="{ color: feature.color }">customers.xlsx</span>
        </div>
      </div>
    </template>

    <template v-else-if="feature.id === 'organize'">
      <div class="um-rows tight">
        <div class="um-row"><i class="material-icons" :style="{ color: feature.color }">folder_open</i>Production</div>
        <div class="um-row indent muted"><i class="material-icons small db">storage</i>postgres-primary</div>
        <div class="um-row indent muted"><i class="material-icons small db">storage</i>read-replica</div>
        <div class="um-row"><i class="material-icons" :style="{ color: feature.color }">folder</i>Staging</div>
        <div class="um-row"><i class="material-icons" :style="{ color: feature.color }">folder</i>Local</div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'

interface Feature { id: string; color: string; icon?: string }

export default Vue.extend({
  props: {
    feature: { type: Object as PropType<Feature>, required: true }
  },
  data() {
    return {
      dbChips: ['Oracle', 'Cassandra', 'ClickHouse', 'DuckDB', 'Firebird', 'LibSQL', 'ScyllaDB'],
      jsonSample: `{
  "id": 1247,
  "name": "Acme Inc",
  "owner_id": 88,
  "owner": ▾ {
    "id": 88,
    "email": "sara@acme.io",
    "team": ▸ {…3 fields}
  },
  "plan": "professional"
}`
    }
  }
})
</script>

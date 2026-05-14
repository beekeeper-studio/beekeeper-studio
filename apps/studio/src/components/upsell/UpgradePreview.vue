<template>
  <div class="um-preview-card" :class="`um-preview-${feature.id}`">
    <!-- Cloud Workspaces: mirror the real workspace switcher avatars + list -->
    <template v-if="feature.id === 'workspaces'">
      <div class="ump-workspaces">
        <ul class="ump-ws-avatars">
          <li class="ump-ws-avatar local" title="Local Workspace">
            <i class="material-icons">computer</i>
          </li>
          <li class="ump-ws-avatar acme active" title="Acme Inc">A</li>
          <li class="ump-ws-avatar globex" title="Globex Corp">G</li>
          <li class="ump-ws-avatar add" title="New Workspace">
            <i class="material-icons">add</i>
          </li>
        </ul>
        <div class="ump-ws-body">
          <div class="ump-ws-head">
            <span class="ump-ws-name">Acme Inc</span>
            <span class="ump-ws-tag">team · 12 members</span>
          </div>
          <ul class="ump-ws-list">
            <li><i class="bk bk-database"></i>analytics-replica</li>
            <li><i class="bk bk-database"></i>billing-prod</li>
            <li><i class="material-icons sm">bookmark</i>top customers this month</li>
          </ul>
        </div>
      </div>
    </template>

    <!-- SQL AI Shell: use the real animated upsell preview -->
    <template v-else-if="feature.id === 'ai'">
      <ai-shell-preview class="ump-ai-shell" />
    </template>

    <!-- Enterprise connectivity: SSO terminal + database chips -->
    <template v-else-if="feature.id === 'enterprise'">
      <div class="ump-section-label">Authentication</div>
      <div class="ump-term">
        <div><span class="ump-prompt">$</span> aws sso login --profile prod</div>
        <div class="ump-ok">
          <i class="material-icons">check_circle</i>
          Authenticated as alice@company.com
        </div>
        <div class="ump-connect">
          → Connecting to <span class="ump-link">rds-prod.us-east-1</span>
          <span class="ump-muted-xs"> · no password required</span>
        </div>
      </div>
      <div class="ump-chips">
        <span v-for="db in dbChips" :key="db">{{ db }}</span>
      </div>
    </template>

    <!-- JSON Sidebar: looks like the real sidebar header + json text -->
    <template v-else-if="feature.id === 'json'">
      <div class="ump-json-header">
        <div class="ump-json-filter">
          <i class="material-icons">search</i>
          <span class="ump-json-placeholder">Filter keys by text or /regex/</span>
        </div>
      </div>
      <pre class="ump-json">{{ jsonSample }}</pre>
    </template>

    <!-- Editable query results: spreadsheet with one edited cell -->
    <template v-else-if="feature.id === 'editable'">
      <div class="ump-editable-table">
        <div class="ump-eth">id</div>
        <div class="ump-eth">name</div>
        <div class="ump-eth">plan</div>
        <div class="ump-eth">updated_at</div>

        <div class="ump-cell num">12</div>
        <div class="ump-cell strong">Acme Inc</div>
        <div class="ump-cell ump-cell-editing" :style="{ boxShadow: `inset 0 0 0 1.5px ${feature.color}` }">
          professional<span class="ump-pencil">✎</span>
        </div>
        <div class="ump-cell muted">2024-08-12</div>

        <div class="ump-cell num">13</div>
        <div class="ump-cell strong">Globex Corp</div>
        <div class="ump-cell strong">indie</div>
        <div class="ump-cell muted">2024-08-09</div>
      </div>
      <div class="ump-staged">
        <i class="material-icons" :style="{ color: feature.color }">edit</i>
        1 staged change · <span class="muted">customers.plan</span>
        <span class="ump-apply">Apply</span>
      </div>
    </template>

    <!-- Import / Export / Backup -->
    <template v-else-if="feature.id === 'io'">
      <div class="ump-section-label">Export tables</div>
      <ul class="ump-export-list">
        <li><i class="material-icons">check_box</i>customers<span class="ump-meta">412 KB</span></li>
        <li><i class="material-icons">check_box</i>orders<span class="ump-meta">2.1 MB</span></li>
        <li><i class="material-icons">check_box</i>line_items<span class="ump-meta">8.4 MB</span></li>
      </ul>
      <div class="ump-export-target">
        <i class="material-icons">save_alt</i>
        Export 3 tables → <span :style="{ color: feature.color }">customers.xlsx</span>
      </div>
    </template>

    <!-- ER Diagrams: miniature ERD with two connected entity boxes -->
    <template v-else-if="feature.id === 'erd'">
      <div class="ump-erd">
        <div class="ump-erd-table dashed">
          <div class="ump-erd-thead">
            <i class="material-icons">grid_on</i>
            <span>users</span>
          </div>
          <div class="ump-erd-col">
            <i class="material-icons pk">key</i><span class="name">id</span><span class="type">INTEGER</span>
          </div>
          <div class="ump-erd-col">
            <i class="material-icons fk">key</i><span class="name">org_id</span><span class="type">INTEGER</span>
          </div>
          <div class="ump-erd-col">
            <span class="name pad">email</span><span class="type">TEXT</span>
          </div>
        </div>
        <svg class="ump-erd-line" viewBox="0 0 60 80" preserveAspectRatio="none" aria-hidden="true">
          <path d="M 0 22 C 30 22, 30 40, 60 40" fill="none" stroke="currentColor" stroke-width="1.2" />
          <path d="M 0 58 C 30 58, 30 40, 60 40" fill="none" stroke="currentColor" stroke-width="1.2" />
          <path d="M 4 18 L 0 22 L 4 26 M 0 22 L 10 22" fill="none" stroke="currentColor" stroke-width="1.2" />
          <path d="M 4 54 L 0 58 L 4 62 M 0 58 L 10 58" fill="none" stroke="currentColor" stroke-width="1.2" />
        </svg>
        <div class="ump-erd-table focused">
          <div class="ump-erd-thead">
            <i class="material-icons">grid_on</i>
            <span>organizations</span>
          </div>
          <div class="ump-erd-col">
            <i class="material-icons pk">key</i><span class="name">id</span><span class="type">INTEGER</span>
          </div>
          <div class="ump-erd-col">
            <span class="name pad">name</span><span class="type">TEXT</span>
          </div>
          <div class="ump-erd-col">
            <span class="name pad">plan</span><span class="type">TEXT</span>
          </div>
        </div>
      </div>
    </template>

    <!-- Folders / Organization: mirrors the real sidebar structure -->
    <template v-else-if="feature.id === 'organize'">
      <ul class="ump-sidebar-tree">
        <li class="folder open">
          <i class="material-icons arrow">keyboard_arrow_right</i>
          <i class="material-icons fld">folder</i>
          <span class="lbl">Production</span>
        </li>
        <li class="folder-children">
          <ul>
            <li class="item"><i class="bk bk-database"></i><span class="lbl">postgres-primary</span><i class="bk bk-pin pin"></i></li>
            <li class="item"><i class="bk bk-database"></i><span class="lbl">read-replica</span></li>
          </ul>
        </li>
        <li class="folder open">
          <i class="material-icons arrow">keyboard_arrow_right</i>
          <i class="material-icons fld">folder</i>
          <span class="lbl">Staging</span>
        </li>
        <li class="folder-children">
          <ul>
            <li class="item"><i class="bk bk-database"></i><span class="lbl">stage-pg</span></li>
          </ul>
        </li>
        <li class="folder">
          <i class="material-icons arrow">keyboard_arrow_right</i>
          <i class="material-icons fld">folder</i>
          <span class="lbl">Local</span>
        </li>
      </ul>
    </template>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'
import AiShellPreview from './AiShellPreview.vue'

interface Feature { id: string; color: string; icon?: string }

export default Vue.extend({
  components: { AiShellPreview },
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

<template>
  <div class="um-preview-card" :class="`um-preview-${feature.id}`">
    <!-- Cloud Workspaces: mirror the real workspace switcher + connections -->
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
            <li class="connection">
              <span class="connection-label connection-label-color-blue"></span>
              <span class="title">analytics-replica</span>
              <span class="type">postgres</span>
            </li>
            <li class="connection">
              <span class="connection-label connection-label-color-green"></span>
              <span class="title">billing-prod</span>
              <span class="type">mysql</span>
            </li>
            <li class="query">
              <i class="material-icons">code</i>
              <span class="title">top customers this month</span>
            </li>
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
      <div class="ump-enterprise">
        <div class="ump-ent-col">
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
        </div>
        <div class="ump-ent-col">
          <div class="ump-section-label">More databases</div>
          <div class="ump-chips">
            <span v-for="db in dbChips" :key="db">{{ db }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- JSON Sidebar: shows a selected row in a table alongside the JSON viewer -->
    <template v-else-if="feature.id === 'json'">
      <div class="ump-json-split">
        <div class="ump-json-table">
          <div class="ump-jt-row ump-jt-head">
            <div class="ump-jt-cell num">#</div>
            <div class="ump-jt-cell">name</div>
            <div class="ump-jt-cell">email</div>
            <div class="ump-jt-cell">plan</div>
          </div>
          <div class="ump-jt-row">
            <div class="ump-jt-cell num">1246</div>
            <div class="ump-jt-cell">Globex</div>
            <div class="ump-jt-cell">li@globex.io</div>
            <div class="ump-jt-cell">indie</div>
          </div>
          <div class="ump-jt-row selected">
            <div class="ump-jt-cell num">1247</div>
            <div class="ump-jt-cell">Acme Inc</div>
            <div class="ump-jt-cell">sara@acme.io</div>
            <div class="ump-jt-cell">pro</div>
          </div>
          <div class="ump-jt-row">
            <div class="ump-jt-cell num">1248</div>
            <div class="ump-jt-cell">Initech</div>
            <div class="ump-jt-cell">p@initech.com</div>
            <div class="ump-jt-cell">free</div>
          </div>
          <div class="ump-jt-row">
            <div class="ump-jt-cell num">1249</div>
            <div class="ump-jt-cell">Hooli</div>
            <div class="ump-jt-cell">b@hooli.xyz</div>
            <div class="ump-jt-cell">team</div>
          </div>
          <div class="ump-jt-row">
            <div class="ump-jt-cell num">1250</div>
            <div class="ump-jt-cell">Stark</div>
            <div class="ump-jt-cell">tony@stark</div>
            <div class="ump-jt-cell">pro</div>
          </div>
        </div>
        <div class="ump-json-side">
          <div class="ump-json-side-inner">
            <pre class="ump-json"><span class="p">{</span>
  <span class="k">"id"</span><span class="p">:</span> <span class="n">1247</span><span class="p">,</span>
  <span class="k">"name"</span><span class="p">:</span> <span class="v">"Acme Inc"</span><span class="p">,</span>
  <span class="k">"plan"</span><span class="p">:</span> <span class="v">"pro"</span><span class="p">,</span>
  <span class="k">"owner_id"</span><span class="p">:</span> <span class="n">88</span> <span class="fk">→ users</span><span class="p">,</span>
  <span class="k">"owner"</span><span class="p">:</span> <span class="caret">▾</span> <span class="p">{</span>
    <span class="k">"id"</span><span class="p">:</span> <span class="n">88</span><span class="p">,</span>
    <span class="k">"email"</span><span class="p">:</span> <span class="v">"sara@acme.io"</span><span class="p">,</span>
    <span class="k">"team_id"</span><span class="p">:</span> <span class="n">3</span> <span class="fk">→ teams</span><span class="p">,</span>
    <span class="k">"team"</span><span class="p">:</span> <span class="caret">▾</span> <span class="p">{</span>
      <span class="k">"name"</span><span class="p">:</span> <span class="v">"Eng"</span><span class="p">,</span>
      <span class="k">"seats"</span><span class="p">:</span> <span class="n">12</span>
    <span class="p">}</span>
  <span class="p">}</span><span class="p">,</span>
  <span class="k">"metadata"</span><span class="p">:</span> <span class="caret">▸</span> <span class="muted">{…6}</span>
<span class="p">}</span></pre>
          </div>
        </div>
      </div>
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
      <div class="ump-io">
        <div class="ump-io-col">
          <div class="ump-section-label">Tables</div>
          <ul class="ump-export-list">
            <li><i class="material-icons">check_box</i>customers<span class="ump-meta">412 KB</span></li>
            <li><i class="material-icons">check_box</i>orders<span class="ump-meta">2.1 MB</span></li>
            <li><i class="material-icons">check_box</i>line_items<span class="ump-meta">8.4 MB</span></li>
          </ul>
        </div>
        <div class="ump-io-col">
          <div class="ump-section-label">Destination</div>
          <div class="ump-io-row">
            <i class="material-icons">save_alt</i>
            <span :style="{ color: feature.color }">customers.xlsx</span>
          </div>
          <div class="ump-io-row muted"><span class="ump-io-key">Format</span><span>XLSX</span></div>
          <div class="ump-io-row muted"><span class="ump-io-key">Mode</span><span>Multi-table</span></div>
        </div>
      </div>
    </template>

    <!-- ER Diagrams: 3-table Sakila ERD with FK arrows -->
    <template v-else-if="feature.id === 'erd'">
      <div class="ump-erd">
        <div class="ump-erd-table dashed ump-erd-customer">
          <div class="ump-erd-thead">
            <i class="material-icons">grid_on</i>
            <span>customer</span>
          </div>
          <div class="ump-erd-col">
            <i class="material-icons pk">key</i><span class="name">customer_id</span><span class="type">INT</span>
          </div>
          <div class="ump-erd-col">
            <span class="name pad">first_name</span><span class="type">VARCHAR</span>
          </div>
          <div class="ump-erd-col">
            <span class="name pad">email</span><span class="type">VARCHAR</span>
          </div>
        </div>
        <svg class="ump-erd-line" viewBox="0 0 60 160" preserveAspectRatio="none" aria-hidden="true">
          <!-- customer.customer_id (top-left, row 1 of customer) -> rental.customer_id (row 2 of rental) -->
          <path d="M 0 33 C 30 33, 30 90, 60 90" fill="none" stroke="currentColor" stroke-width="1.5" />
          <!-- inventory.inventory_id (bottom-left, row 1 of inventory) -> rental.inventory_id (row 3 of rental) -->
          <path d="M 0 127 C 30 127, 30 108, 60 108" fill="none" stroke="currentColor" stroke-width="1.5" />
          <!-- crow's foot at rental side (many-side / FK column) -->
          <path d="M 55 86 L 60 90 L 55 94 M 55 90 L 50 90" fill="none" stroke="currentColor" stroke-width="1.5" />
          <path d="M 55 104 L 60 108 L 55 112 M 55 108 L 50 108" fill="none" stroke="currentColor" stroke-width="1.5" />
          <!-- single-line cap at PK side (one-side) -->
          <path d="M 0 29 L 0 37" stroke="currentColor" stroke-width="1.5" />
          <path d="M 0 123 L 0 131" stroke="currentColor" stroke-width="1.5" />
        </svg>
        <div class="ump-erd-table dashed ump-erd-inventory">
          <div class="ump-erd-thead">
            <i class="material-icons">grid_on</i>
            <span>inventory</span>
          </div>
          <div class="ump-erd-col">
            <i class="material-icons pk">key</i><span class="name">inventory_id</span><span class="type">INT</span>
          </div>
          <div class="ump-erd-col">
            <i class="material-icons fk">key</i><span class="name">film_id</span><span class="type">INT</span>
          </div>
          <div class="ump-erd-col">
            <i class="material-icons fk">key</i><span class="name">store_id</span><span class="type">INT</span>
          </div>
        </div>
        <div class="ump-erd-table focused ump-erd-rental">
          <div class="ump-erd-thead">
            <i class="material-icons">grid_on</i>
            <span>rental</span>
          </div>
          <div class="ump-erd-col">
            <i class="material-icons pk">key</i><span class="name">rental_id</span><span class="type">INT</span>
          </div>
          <div class="ump-erd-col">
            <i class="material-icons fk">key</i><span class="name">customer_id</span><span class="type">INT</span>
          </div>
          <div class="ump-erd-col">
            <i class="material-icons fk">key</i><span class="name">inventory_id</span><span class="type">INT</span>
          </div>
        </div>
      </div>
    </template>

    <!-- Folders / Organization: mirrors the real sidebar structure -->
    <template v-else-if="feature.id === 'organize'">
      <div class="ump-organize">
        <div class="ump-org-col">
          <div class="ump-section-label">Connections</div>
          <ul class="ump-sidebar-tree">
            <li class="folder open">
              <i class="material-icons arrow">keyboard_arrow_right</i>
              <i class="material-icons fld">folder</i>
              <span class="lbl">Production</span>
            </li>
            <li class="folder-children">
              <ul>
                <li class="item">
                  <span class="connection-label connection-label-color-blue"></span>
                  <span class="lbl">postgres-primary</span>
                  <i class="bk bk-pin pin"></i>
                </li>
                <li class="item">
                  <span class="connection-label connection-label-color-blue"></span>
                  <span class="lbl">read-replica</span>
                </li>
              </ul>
            </li>
            <li class="folder">
              <i class="material-icons arrow">keyboard_arrow_right</i>
              <i class="material-icons fld">folder</i>
              <span class="lbl">Staging</span>
            </li>
            <li class="folder">
              <i class="material-icons arrow">keyboard_arrow_right</i>
              <i class="material-icons fld">folder</i>
              <span class="lbl">Local</span>
            </li>
          </ul>
        </div>
        <div class="ump-org-col">
          <div class="ump-section-label">Saved queries</div>
          <ul class="ump-sidebar-tree">
            <li class="folder open">
              <i class="material-icons arrow">keyboard_arrow_right</i>
              <i class="material-icons fld">folder</i>
              <span class="lbl">Reports</span>
            </li>
            <li class="folder-children">
              <ul>
                <li class="item query">
                  <i class="material-icons">code</i>
                  <span class="lbl">top customers</span>
                  <i class="bk bk-pin pin"></i>
                </li>
                <li class="item query">
                  <i class="material-icons">code</i>
                  <span class="lbl">mrr by month</span>
                </li>
              </ul>
            </li>
            <li class="folder">
              <i class="material-icons arrow">keyboard_arrow_right</i>
              <i class="material-icons fld">folder</i>
              <span class="lbl">Ad-hoc</span>
            </li>
          </ul>
        </div>
      </div>
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
      // Paid-only databases, per docs/includes/supported_databases.md.
      dbChips: [
        'MongoDB',
        'Oracle',
        'Cassandra',
        'ClickHouse',
        'DuckDB',
        'Trino / Presto',
        'DynamoDB',
        'Snowflake',
        'ScyllaDB',
        'Firebird',
        'LibSQL',
        'SQL Anywhere',
        'SurrealDB'
      ]
    }
  }
})
</script>

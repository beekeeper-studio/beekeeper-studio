<template>
  <portal to="modals">
    <modal :name="modalName" class="vue-dialog beekeeper-modal ai-server-modal" :scrollable="true">
      <div class="dialog-content ai-server-modal-content">
        <div class="ai-modal-head">
          <h2>AI Server</h2>
          <a class="close-btn btn btn-fab" href="#" @click.prevent="close">
            <i class="material-icons">clear</i>
          </a>
        </div>

        <div class="ai-server-tabs">
          <a
            v-for="t in tabs"
            :key="t.key"
            :class="['ai-tab-link', { active: activeTab === t.key }]"
            href="#"
            @click.prevent="activeTab = t.key"
          >
            <i class="material-icons">{{ t.icon }}</i>
            <span>{{ t.label }}</span>
          </a>
        </div>

        <div v-if="status.configDisabled" class="ai-config-alert">
          <div class="alert alert-warning">
            The AI server is disabled by user config (<code>aiServer.disabled = true</code>).
            Set it to <code>false</code> in your <code>user.config.ini</code> and restart Beekeeper Studio.
          </div>
        </div>

        <!-- ===================== OVERVIEW ===================== -->
        <div v-if="activeTab === 'overview'" class="ai-server-pane">
          <div class="status-row">
            <span class="status-pill" :class="{ running: status.running, stopped: !status.running }">
              <span class="dot" />{{ status.running ? 'Running' : 'Stopped' }}
            </span>
            <code v-if="status.running" class="status-url">{{ loopbackUrl }}</code>
            <span v-if="status.running && status.startedAt" class="status-started">
              since {{ formattedStartedAt }}
            </span>
          </div>

          <div class="btn-row actions-row">
            <button
              v-if="!status.running"
              class="btn btn-primary"
              :disabled="status.configDisabled || busy"
              @click="start"
            >
              <i class="material-icons">play_arrow</i>Start server
            </button>
            <button
              v-else
              class="btn btn-danger"
              :disabled="busy"
              @click="stop"
            >
              <i class="material-icons">stop</i>Stop server
            </button>
            <button
              v-if="status.requireToken && status.running"
              class="btn"
              :disabled="busy"
              @click="regenerateToken"
              v-tooltip="'Generate a new token. Existing AI sessions must be re-given the new value.'"
            >
              <i class="material-icons">refresh</i>Regenerate token
            </button>
          </div>

          <div v-if="status.running" class="ai-section">
            <div class="ai-section-head">
              <span class="h">Connection</span>
            </div>
            <label class="ai-label">Loopback URL</label>
            <div class="token-row">
              <input class="ai-input" type="text" :value="loopbackUrl" readonly>
              <button class="icon-btn" @click="copy(loopbackUrl)" v-tooltip="'Copy'">
                <i class="material-icons">content_copy</i>
              </button>
            </div>

            <template v-if="status.bindLocal && lanUrls.length">
              <label class="ai-label" style="margin-top:.75rem">
                LAN URLs (reachable from other devices)
              </label>
              <div
                v-for="u in lanUrls"
                :key="u"
                class="token-row"
              >
                <input class="ai-input" type="text" :value="u" readonly>
                <button class="icon-btn" @click="copy(u)" v-tooltip="'Copy'">
                  <i class="material-icons">content_copy</i>
                </button>
              </div>
            </template>

            <template v-if="status.requireToken">
              <label class="ai-label" style="margin-top:.75rem">API token</label>
              <div class="token-row">
                <input
                  class="ai-input"
                  :type="showToken ? 'text' : 'password'"
                  :value="status.token || ''"
                  readonly
                >
                <button class="icon-btn" @click="showToken = !showToken" v-tooltip="'Reveal'">
                  <i class="material-icons">{{ showToken ? 'visibility_off' : 'visibility' }}</i>
                </button>
                <button class="icon-btn" @click="copy(status.token)" v-tooltip="'Copy'">
                  <i class="material-icons">content_copy</i>
                </button>
              </div>
              <div class="ai-help">
                Token is held in memory only. Not written to <code>ai-server.json</code> — paste it into your AI client when prompted.
              </div>
            </template>
            <div v-else class="ai-help warn">
              <i class="material-icons">warning_amber</i>
              <span><b>Token disabled.</b> Anyone who can reach this server can use it.</span>
            </div>
          </div>

          <div class="ai-section">
            <div class="ai-section-head">
              <span class="h">Connected clients</span>
              <span class="meta">{{ clients.length }} known</span>
            </div>
            <div v-if="clients.length === 0" class="clients-empty">
              <i class="material-icons">hub</i>
              <div>
                <div class="t">
                  No clients yet
                </div>
                <div class="d">
                  Set up a client in the <b>Install</b> tab. The first time an unknown client connects you'll get an approve/deny prompt.
                </div>
              </div>
            </div>
            <div v-else class="clients-list">
              <div v-for="c in clients" :key="c.id" class="client-row">
                <span class="client-status" :class="c.status" />
                <div class="client-info">
                  <div class="client-name">
                    {{ c.name }}
                  </div>
                  <div class="client-meta">
                    <span class="client-badge" :class="c.status">{{ c.status }}</span>
                    <span class="sep">·</span>
                    <span>{{ c.requestCount }} request{{ c.requestCount === 1 ? '' : 's' }}</span>
                    <span class="sep">·</span>
                    <span>last seen {{ formatTime(c.lastSeen) }}</span>
                  </div>
                </div>
                <div class="client-actions">
                  <button
                    v-if="c.status !== 'approved'"
                    class="btn btn-primary client-btn"
                    @click="approveClient(c.id)"
                  >
                    Approve
                  </button>
                  <button
                    v-if="c.status === 'pending'"
                    class="btn client-btn"
                    @click="denyClient(c.id)"
                  >
                    Deny
                  </button>
                  <button
                    v-if="c.status === 'approved'"
                    class="btn btn-danger client-btn"
                    @click="revokeClient(c.id)"
                  >
                    Revoke
                  </button>
                  <button
                    v-if="c.status === 'denied'"
                    class="btn btn-ghost client-btn"
                    @click="revokeClient(c.id)"
                  >
                    Forget
                  </button>
                </div>
              </div>
            </div>
            <p class="ai-help inline" style="margin-top:.6rem">
              Revoking a client makes it prompt for approval again next time it connects.
            </p>
          </div>

          <div class="ai-section">
            <div class="ai-section-head">
              <span class="h">Allowed connections</span>
              <span class="meta">{{ grantedConnectionIds.length }} of {{ connectionOptions.length }} exposed</span>
            </div>
            <p class="ai-help inline">
              Pick which saved connections AI agents can read and query. Empty = nothing reachable.
            </p>
            <div class="data-select-wrap">
              <v-select
                v-model="grantedConnectionIds"
                :options="connectionOptions"
                :reduce="opt => opt.id"
                label="name"
                multiple
                :components="{ OpenIndicator }"
                placeholder="Add a saved connection…"
                class="dropdown-search"
              />
            </div>
          </div>

          <div class="ai-section">
            <div class="ai-section-head">
              <span class="h">Allowed saved queries</span>
              <span class="meta">{{ grantedQueryIds.length }} of {{ queryOptions.length }}</span>
            </div>
            <p class="ai-help inline">
              Optional. Lets AI agents reach specific favorites without giving full DB access.
            </p>
            <div class="data-select-wrap">
              <v-select
                v-model="grantedQueryIds"
                :options="queryOptions"
                :reduce="opt => opt.id"
                label="title"
                multiple
                :components="{ OpenIndicator }"
                placeholder="Add a saved query…"
                class="dropdown-search"
              />
            </div>
          </div>

          <div class="ai-section">
            <div class="ai-section-head">
              <span class="h">Permissions</span>
              <span class="meta">Shared by every client</span>
            </div>
            <div class="toggle-row">
              <div class="copy">
                <div class="title">
                  Allow write &amp; DDL statements
                </div>
                <div class="desc">
                  When off, every connection is read-only — <code>SELECT</code> and schema reads only.
                  When on, <code>INSERT</code>/<code>UPDATE</code>/<code>DELETE</code> and
                  <code>CREATE</code>/<code>ALTER</code>/<code>DROP</code> are permitted.
                </div>
              </div>
              <div
                class="switch"
                :class="{ on: localOptions.allowWrites, disabled: busy }"
                role="switch"
                :aria-checked="localOptions.allowWrites"
                @click="!busy && setOption('allowWrites', !localOptions.allowWrites)"
              />
            </div>
          </div>

          <div class="ai-section">
            <div class="ai-section-head">
              <span class="h">Server settings</span>
            </div>
            <div class="toggle-row">
              <div class="copy">
                <div class="title">
                  Require an API token
                </div>
                <div class="desc">
                  Forces every request to present the bearer token shown above.
                  <span v-if="localOptions.bindLocal">Forced on while binding to the local network.</span>
                </div>
              </div>
              <div
                class="switch"
                :class="{ on: localOptions.requireToken, disabled: localOptions.bindLocal || busy }"
                role="switch"
                :aria-checked="localOptions.requireToken"
                @click="!localOptions.bindLocal && !busy && onRequireTokenToggle(!localOptions.requireToken)"
              />
            </div>
            <div class="toggle-row">
              <div class="copy">
                <div class="title">
                  Allow connections from the local network
                </div>
                <div class="desc">
                  Binds on <code>0.0.0.0</code> instead of <code>127.0.0.1</code>. Only enable on networks you trust.
                </div>
              </div>
              <div
                class="switch"
                :class="{ on: localOptions.bindLocal, disabled: busy }"
                role="switch"
                :aria-checked="localOptions.bindLocal"
                @click="!busy && onBindLocalToggle(!localOptions.bindLocal)"
              />
            </div>
            <div class="toggle-row">
              <div class="copy">
                <div class="title">
                  Always prompt for new clients
                </div>
                <div class="desc">
                  Show an approve/deny prompt the first time an unknown client connects. When off, new clients are allowed automatically.
                </div>
              </div>
              <div
                class="switch"
                :class="{ on: localOptions.promptForNewClients, disabled: busy }"
                role="switch"
                :aria-checked="localOptions.promptForNewClients"
                @click="!busy && setOption('promptForNewClients', !localOptions.promptForNewClients)"
              />
            </div>
            <div class="toggle-row">
              <div class="copy">
                <div class="title">
                  Auto-start on app launch
                </div>
                <div class="desc">
                  Boot the server when Beekeeper Studio opens.
                </div>
              </div>
              <div
                class="switch"
                :class="{ on: localOptions.autoStart, disabled: busy }"
                role="switch"
                :aria-checked="localOptions.autoStart"
                @click="!busy && setOption('autoStart', !localOptions.autoStart)"
              />
            </div>
            <div class="toggle-row port-row">
              <div class="copy">
                <div class="title">
                  Port
                </div>
                <div class="desc">
                  Currently <code>{{ status.port || 'not running' }}</code>. Changing the port requires a server restart and a <code>user.config.ini</code> edit.
                </div>
              </div>
              <button class="btn btn-ghost" disabled>
                Change…
              </button>
            </div>
          </div>
        </div>

        <!-- ===================== LOGS ===================== -->
        <div v-if="activeTab === 'log'" class="ai-server-pane">
          <!--
            TODO(ai-server-log-filters): search / connection / tool / status
            filters and live-tail toggle are stubs — they render the design
            but don't currently filter the log. Wire each filter to a
            computed once the backend returns enough metadata per entry
            (connection name + tool name are already there; status is
            derivable from `entry.error`).
          -->
          <div class="log-toolbar">
            <div class="search">
              <i class="material-icons">search</i>
              <input v-model="logSearch" placeholder="Filter by SQL or tool…">
            </div>
            <div class="selectbox" :title="'TODO: wire connection filter'">
              All connections <i class="material-icons">arrow_drop_down</i>
            </div>
            <div class="selectbox" :title="'TODO: wire tool filter'">
              All tools <i class="material-icons">arrow_drop_down</i>
            </div>
            <div class="selectbox" :title="'TODO: wire status filter'">
              Status <i class="material-icons">arrow_drop_down</i>
            </div>
            <div class="tail">
              <div class="switch" :class="{ on: liveTail }" @click="liveTail = !liveTail" />
              <span>Live tail</span>
            </div>
            <button
              class="icon-btn"
              v-tooltip="'Clear'"
              :disabled="busy"
              @click="clearLog"
            >
              <i class="material-icons">delete_outline</i>
            </button>
          </div>

          <div class="log-table" v-if="filteredLog.length">
            <template v-for="entry in filteredLog">
              <div
                :key="`row-${entry.id}`"
                class="log-row"
                :class="{ selected: selectedLogId === entry.id, error: !!entry.error }"
                @click="toggleLogRow(entry.id)"
              >
                <span class="time">{{ formatTime(entry.ts) }}</span>
                <span class="tool">
                  <i class="material-icons">code</i>
                  {{ entry.tool || 'run_query' }}
                </span>
                <span class="conn">
                  <span
                    class="conn-dot"
                    :style="{ background: dbColor(entry.connectionType) }"
                  />
                  {{ entry.connectionName || '—' }}
                </span>
                <span class="dur">{{ entry.durationMs != null ? entry.durationMs + 'ms' : '—' }}</span>
                <span class="stat" :class="entry.error ? 'err' : 'ok'">
                  <i class="material-icons">{{ entry.error ? 'error' : 'check_circle' }}</i>
                </span>
              </div>
              <div
                v-if="selectedLogId === entry.id"
                :key="`detail-${entry.id}`"
                class="log-detail"
              >
                <div class="grid">
                  <div>
                    <div class="k">
                      Connection
                    </div>
                    <div class="v">
                      {{ entry.connectionName || '—' }}
                    </div>
                  </div>
                  <div>
                    <div class="k">
                      Tool
                    </div>
                    <div class="v">
                      {{ entry.tool || 'run_query' }}
                    </div>
                  </div>
                  <div>
                    <div class="k">
                      Duration
                    </div>
                    <div class="v">
                      {{ entry.durationMs != null ? entry.durationMs + 'ms' : '—' }}
                    </div>
                  </div>
                  <div>
                    <div class="k">
                      Rows
                    </div>
                    <div class="v">
                      {{ entry.rowCount != null ? entry.rowCount : '—' }}
                      <span v-if="entry.truncated" class="badge truncated" v-tooltip="'Result truncated by max-rows cap'">cap</span>
                    </div>
                  </div>
                </div>
                <pre class="sql">{{ entry.sql }}</pre>
                <div v-if="entry.error" class="error-box">
                  {{ entry.error }}
                </div>
              </div>
            </template>
          </div>
          <div v-else class="log-empty">
            <i class="material-icons">list_alt</i>
            <div>
              <div class="t">
                No queries logged yet
              </div>
              <div class="d">
                Calls from your AI client will appear here in real time.
              </div>
            </div>
          </div>

          <div class="ai-help" style="display:flex; align-items:center; margin-top:.65rem">
            <i class="material-icons" style="font-size:14px; margin-right:6px; opacity:.6">info</i>
            Last {{ filteredLog.length }} of {{ log.length }} calls. Logs live in memory and clear on quit.
          </div>
        </div>

        <!-- ===================== INSTALL ===================== -->
        <div v-if="activeTab === 'install'" class="ai-server-pane">
          <div class="stepper">
            <div :class="['step', stepClass(1)]">
              <span class="num">
                <i v-if="installStep > 1" class="material-icons">check</i>
                <template v-else>1</template>
              </span>
              Pick client
            </div>
            <div class="seg" />
            <div :class="['step', stepClass(2)]">
              <span class="num">
                <i v-if="installStep > 2" class="material-icons">check</i>
                <template v-else>2</template>
              </span>
              Copy command
            </div>
            <div class="seg" />
            <div :class="['step', stepClass(3)]">
              <span class="num">3</span>
              Verify
            </div>
          </div>

          <!-- STEP 1 -->
          <div v-if="installStep === 1">
            <div class="ai-label">
              Which client are you connecting?
            </div>
            <div class="client-grid">
              <div
                v-for="c in installClients"
                :key="c.id"
                :class="['client-card', { selected: selectedClientId === c.id }]"
                @click="selectedClientId = c.id"
              >
                <div class="logo" v-html="c.logo" />
                <div class="info">
                  <div class="name">
                    {{ c.name }}
                  </div>
                  <div class="desc">
                    {{ c.desc }}
                  </div>
                </div>
              </div>
            </div>
            <p class="ai-help inline">
              Only Claude Code is fully wired today — the others use the generic MCP/skill path. Detailed setup docs are on the roadmap.
            </p>
          </div>

          <!-- STEP 2 -->
          <div v-if="installStep === 2">
            <div class="ai-label">
              Add the server to
              <span class="accent">{{ selectedClient.name }}</span>
            </div>
            <p class="ai-help inline">
              <template v-if="status.requireToken">
                Run this in any terminal. The token is held in memory — re-run if you regenerate it.
              </template>
              <template v-else>
                The server has no token, so just add it directly.
              </template>
            </p>

            <template v-if="usesGenericMcp">
              <template v-if="status.requireToken">
                <h5 class="ai-step-h">
                  Option A — paste the token in chat (one prompt, no env var)
                </h5>
                <p class="ai-help inline">
                  Add with no token. First tool call prompts you for it; token lives in that session only.
                </p>
                <div class="codeblock">
                  <button class="copy-btn" @click="copy(mcpInstallCommandPrompt)">
                    <i class="material-icons">content_copy</i>Copy
                  </button>
                  <pre>{{ mcpInstallCommandPrompt }}</pre>
                </div>

                <h5 class="ai-step-h">
                  Option B — pass the token as an env var (no prompts)
                </h5>
                <p class="ai-help inline">
                  The MCP process reads the token at startup. Re-run after regenerating.
                </p>
                <div class="codeblock">
                  <button class="copy-btn" @click="copy(mcpInstallCommandEnv)">
                    <i class="material-icons">content_copy</i>Copy
                  </button>
                  <pre>{{ mcpInstallCommandEnv }}</pre>
                </div>
              </template>

              <template v-else>
                <div class="codeblock">
                  <button class="copy-btn" @click="copy(mcpInstallCommandNoToken)">
                    <i class="material-icons">content_copy</i>Copy
                  </button>
                  <pre>{{ mcpInstallCommandNoToken }}</pre>
                </div>
              </template>

              <div class="ai-subsection">
                <div class="ai-label">
                  Pre-approve every Beekeeper tool
                </div>
                <p class="ai-help inline">
                  Add this rule under <code>permissions.allow</code> in <code>~/.claude/settings.json</code>:
                </p>
                <div class="codeblock">
                  <button class="copy-btn" @click="copy(mcpPermissionRule)">
                    <i class="material-icons">content_copy</i>Copy
                  </button>
                  <pre>{{ mcpPermissionRule }}</pre>
                </div>
                <p class="ai-help inline">
                  Or, with <code>jq</code>:
                </p>
                <div class="codeblock">
                  <button class="copy-btn" @click="copy(mcpPermissionJqCommand)">
                    <i class="material-icons">content_copy</i>Copy
                  </button>
                  <pre>{{ mcpPermissionJqCommand }}</pre>
                </div>
              </div>
            </template>

            <template v-else-if="selectedClient.id === 'generic-skill'">
              <p class="ai-help inline">
                The skill is a thinner wrapper that shells out via <code>Bash</code>. It works, but Claude Code may prompt before each invocation.
              </p>
              <div class="codeblock">
                <button class="copy-btn" @click="copy(skillInstallCommand)">
                  <i class="material-icons">content_copy</i>Copy
                </button>
                <pre>{{ skillInstallCommand }}</pre>
              </div>
            </template>

            <p class="ai-help inline" style="margin-top:1rem">
              Discovery file:
              <code class="path">{{ portFilePath }}</code>
            </p>
          </div>

          <!-- STEP 3 -->
          <div v-if="installStep === 3">
            <div class="ai-label">
              Verify the connection
            </div>
            <div class="verify-box" :class="{ connected: verifyConnected }">
              <div v-if="verifyConnected" class="check">
                <i class="material-icons">check</i>
              </div>
              <div v-else class="spinner" />
              <div class="copy">
                <div class="title">
                  {{ verifyConnected ? 'Client connected' : 'Waiting for the first call from your client…' }}
                </div>
                <div class="desc">
                  <template v-if="verifyConnected">
                    A call came through from {{ selectedClient.name }}. You're all set — check the Query log tab to watch activity.
                  </template>
                  <template v-else>
                    Make a request in {{ selectedClient.name }} (e.g. ask it to list tables). This flips to connected as soon as a call arrives.
                  </template>
                </div>
              </div>
            </div>
            <p v-if="!status.running" class="ai-help warn" style="margin-top:.75rem">
              <i class="material-icons">warning_amber</i>
              <span>The server is stopped — start it on the Overview tab before verifying.</span>
            </p>
          </div>

          <!-- Step nav -->
          <div class="btn-row install-nav">
            <button
              v-if="installStep > 1"
              class="btn"
              @click="installStep = installStep - 1"
            >
              <i class="material-icons">arrow_back</i>Back
            </button>
            <span style="flex:1" />
            <button
              v-if="installStep < 3"
              class="btn btn-primary"
              @click="installStep = installStep + 1"
            >
              Next<i class="material-icons">arrow_forward</i>
            </button>
            <button
              v-else
              class="btn btn-primary"
              @click="close"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </modal>
  </portal>
</template>

<script lang="ts">
import Vue from "vue";
import _ from "lodash";
import { mapState, mapGetters } from "vuex";
import vSelect from "vue-select";
import { AppEvent } from "@/common/AppEvent";
import {
  AiServerGrants,
  AiServerLogEntry,
  AiServerOptions,
  AiServerStatusWithToken,
  DEFAULT_OPTIONS,
} from "@/common/interfaces/IAiServer";

interface ConnLike { id: number; name: string; connectionType: string; }
interface QueryLike { id: number; title: string; database: string | null; }
interface ClientChoice { id: string; name: string; desc: string; logo: string; }

// Vendor logos — small inline SVGs evoking each client (NOT pixel-accurate brand
// marks). Kept as strings rather than Vue components so we can v-html them.
const VENDOR_LOGOS: Record<string, string> = {
  "claude-code": `
    <svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="8" fill="#F1E9D8" />
      <g fill="#C96342" stroke="#C96342" stroke-linecap="round">
        <line x1="22" y1="18" x2="28" y2="18" stroke-width="2.5"/>
        <line x1="8" y1="18"  x2="14" y2="18" stroke-width="2.5"/>
        <line x1="18" y1="22" x2="18" y2="28" stroke-width="2.5"/>
        <line x1="18" y1="8"  x2="18" y2="14" stroke-width="2.5"/>
        <line x1="14" y1="14" x2="10" y2="10" stroke-width="2.5"/>
        <line x1="22" y1="14" x2="26" y2="10" stroke-width="2.5"/>
        <line x1="14" y1="22" x2="10" y2="26" stroke-width="2.5"/>
        <line x1="22" y1="22" x2="26" y2="26" stroke-width="2.5"/>
        <circle cx="18" cy="18" r="3"/>
      </g>
    </svg>`,
  "opencode": `
    <svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="8" fill="#0F1419"/>
      <rect x="3" y="3" width="30" height="30" rx="6" fill="none" stroke="#3FB950" stroke-width="1" opacity="0.4"/>
      <text x="9" y="24" font-family="ui-monospace, Menlo, monospace" font-size="14" font-weight="700" fill="#3FB950">&gt;_</text>
    </svg>`,
  "codex": `
    <svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="8" fill="#0D0D0D"/>
      <g stroke="#FFFFFF" stroke-width="1.5" fill="none" stroke-linecap="round">
        <circle cx="18" cy="18" r="8"/>
        <ellipse cx="18" cy="18" rx="8" ry="3.2" transform="rotate(30 18 18)"/>
        <ellipse cx="18" cy="18" rx="8" ry="3.2" transform="rotate(-30 18 18)"/>
        <ellipse cx="18" cy="18" rx="8" ry="3.2"/>
      </g>
    </svg>`,
  "gemini-cli": `
    <svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="vg-gem" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#4796E3"/>
          <stop offset="50%" stop-color="#9168C0"/>
          <stop offset="100%" stop-color="#D96570"/>
        </linearGradient>
      </defs>
      <rect width="36" height="36" rx="8" fill="#0F1729"/>
      <path
        d="M18 5 C 18 13, 19 14, 31 18 C 19 22, 18 23, 18 31 C 18 23, 17 22, 5 18 C 17 14, 18 13, 18 5 Z"
        fill="url(#vg-gem)"
      />
    </svg>`,
  "generic-mcp": `
    <svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="8" fill="#FAD83B"/>
      <g stroke="rgba(0,0,0,0.85)" stroke-width="2" stroke-linecap="round">
        <line x1="18" y1="18" x2="10" y2="11"/>
        <line x1="18" y1="18" x2="26" y2="11"/>
        <line x1="18" y1="18" x2="18" y2="28"/>
      </g>
      <g fill="rgba(0,0,0,0.85)">
        <circle cx="10" cy="11" r="2.6"/>
        <circle cx="26" cy="11" r="2.6"/>
        <circle cx="18" cy="28" r="2.6"/>
        <circle cx="18" cy="18" r="3.8"/>
      </g>
    </svg>`,
  "generic-skill": `
    <svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="8" fill="#1E2233"/>
      <path d="M11 25 L23 13" stroke="#A78BFA" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M25 8 L26.5 11 L29.5 12.5 L26.5 14 L25 17 L23.5 14 L20.5 12.5 L23.5 11 Z" fill="#FBBF24"/>
      <circle cx="11" cy="25" r="1.4" fill="#A78BFA"/>
      <circle cx="14" cy="9"  r="0.9" fill="#A78BFA"/>
      <circle cx="9"  cy="14" r="0.9" fill="#A78BFA"/>
    </svg>`,
};

const CLIENTS: ClientChoice[] = [
  { id: "claude-code",   name: "Claude Code",        desc: "CLI agent — claude mcp add …",          logo: VENDOR_LOGOS["claude-code"] },
  { id: "opencode",      name: "OpenCode",           desc: "Open-source terminal coding agent",     logo: VENDOR_LOGOS["opencode"] },
  { id: "codex",         name: "Codex",              desc: "OpenAI Codex CLI — codex mcp add …",    logo: VENDOR_LOGOS["codex"] },
  { id: "gemini-cli",    name: "Gemini CLI",         desc: "Google's CLI — gemini extensions",      logo: VENDOR_LOGOS["gemini-cli"] },
  { id: "generic-mcp",   name: "Generic MCP server", desc: "Any MCP-aware client (config JSON)",    logo: VENDOR_LOGOS["generic-mcp"] },
  { id: "generic-skill", name: "Generic skill",      desc: "Drop into any skill-based agent",       logo: VENDOR_LOGOS["generic-skill"] },
];

// Connection-type pill colors, mirroring the sidebar's saved-connection pills.
const DB_COLORS: Record<string, string> = {
  postgresql:  "#336791",
  mysql:       "#00758f",
  mariadb:     "#c0765c",
  sqlite:      "#7ebcd6",
  sqlserver:   "#a91d22",
  oracle:      "#c74634",
  cassandra:   "#1287b1",
  cockroachdb: "#6933ff",
  redshift:    "#8c4fff",
  bigquery:    "#669df6",
  firebird:    "#f47920",
  duckdb:      "#fff100",
  clickhouse:  "#ffcc01",
  mongodb:     "#13aa52",
  dynamodb:    "#4d72b8",
};

export default Vue.extend({
  name: "AiServerModal",
  components: { vSelect },
  data() {
    return {
      modalName: "ai-server-modal",
      activeTab: "overview" as "overview" | "log" | "install",
      tabs: [
        { key: "overview", label: "Overview",  icon: "tune" },
        { key: "log",      label: "Query log", icon: "list_alt" },
        { key: "install",  label: "Install",   icon: "rocket_launch" },
      ],
      busy: false,
      showToken: false,
      logListenerId: null as string | null,
      statusListenerId: null as string | null,
      // Local copy of options so checkbox edits don't toggle visually before persistence.
      localOptions: { ...DEFAULT_OPTIONS } as AiServerOptions,
      // Material-icon dropdown indicator for vue-select (matches the rest of the app).
      OpenIndicator: {
        render: (h: any) => h("i", { class: { "material-icons": true } }, "arrow_drop_down"),
      },
      // Install stepper
      installStep: 1 as 1 | 2 | 3,
      selectedClientId: "claude-code",
      installClients: CLIENTS,
      // Timestamp the user reached install step 3 — drives the verify check.
      installStep3SeenAt: null as number | null,
      // Query log UI state (filters are stubs — see TODO above the toolbar)
      logSearch: "",
      liveTail: true,
      selectedLogId: null as string | null,
    };
  },
  computed: {
    ...mapState("aiServer", ["status", "grants", "log", "options", "clients"]),
    ...mapGetters("aiServer", ["serverUrl"]),
    connectionOptions(): ConnLike[] {
      const items = (this.$store.state["data/connections"]?.items ?? []) as ConnLike[];
      return [...items].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    },
    queryOptions(): QueryLike[] {
      const items = (this.$store.state["data/queries"]?.items ?? []) as QueryLike[];
      return [...items].sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    },
    grantedConnectionIds: {
      get(): number[] {
        return (this.grants?.connections ?? []).map((g: { connectionId: number }) => g.connectionId);
      },
      set(ids: number[]) {
        const existing = new Map(
          (this.grants?.connections ?? []).map((g: any) => [g.connectionId, g])
        );
        const next: AiServerGrants = {
          connections: ids.map((id) =>
            (existing.get(id) as any) ?? { connectionId: id, readOnly: this.defaultReadOnly }
          ),
          queries: [...(this.grants?.queries ?? [])],
          workspaceIds: [...(this.grants?.workspaceIds ?? [])],
        };
        this.queueGrantsSave(next);
      },
    },
    grantedQueryIds: {
      get(): number[] {
        return [...(this.grants?.queries ?? [])];
      },
      set(ids: number[]) {
        const next: AiServerGrants = {
          connections: [...(this.grants?.connections ?? [])],
          queries: ids,
          workspaceIds: [...(this.grants?.workspaceIds ?? [])],
        };
        this.queueGrantsSave(next);
      },
    },
    defaultReadOnly(): boolean {
      return this.$bksConfig?.aiServer?.defaultReadOnly !== false;
    },
    formattedStartedAt(): string {
      if (!this.status.startedAt) return "";
      try { return new Date(this.status.startedAt).toLocaleTimeString(); } catch { return this.status.startedAt; }
    },
    loopbackUrl(): string {
      return `http://127.0.0.1:${this.status.port}`;
    },
    lanUrls(): string[] {
      return (this.status.lanAddresses ?? []).map((a: string) => `http://${a}:${this.status.port}`);
    },
    portFilePath(): string {
      const dir = this.$config?.userDirectory || "~/.config/beekeeper-studio";
      return `${dir}/ai-server.json`;
    },
    selectedClient(): ClientChoice {
      return this.installClients.find((c) => c.id === this.selectedClientId) || this.installClients[0];
    },
    // The MCP install command is the same across every "MCP-aware" client today
    // (we ship one server, with one install path). The generic skill has its own.
    usesGenericMcp(): boolean {
      return this.selectedClient.id !== "generic-skill";
    },
    mcpInstallCommandNoToken(): string {
      return "claude mcp add --scope user beekeeper -- npx -y @beekeeperstudio/mcp-server";
    },
    mcpInstallCommandPrompt(): string {
      return "claude mcp add --scope user beekeeper -- npx -y @beekeeperstudio/mcp-server";
    },
    mcpInstallCommandEnv(): string {
      const t = (this.status as AiServerStatusWithToken).token;
      const value = t ? `'${t}'` : "<paste from above>";
      return `BEEKEEPER_AI_SERVER_TOKEN=${value} claude mcp add --scope user beekeeper --env BEEKEEPER_AI_SERVER_TOKEN -- npx -y @beekeeperstudio/mcp-server`;
    },
    mcpPermissionRule(): string {
      return "mcp__beekeeper";
    },
    mcpPermissionJqCommand(): string {
      return `jq '.permissions = (.permissions // {}) | .permissions.allow = ((.permissions.allow // []) + ["mcp__beekeeper"] | unique)' ~/.claude/settings.json > /tmp/s.json && mv /tmp/s.json ~/.claude/settings.json`;
    },
    skillInstallCommand(): string {
      return "curl -fsSL https://beekeeperstudio.io/skills/install.sh | sh";
    },
    reversedLog(): AiServerLogEntry[] {
      return [...(this.log ?? [])].reverse();
    },
    filteredLog(): AiServerLogEntry[] {
      // Stub — only the SQL search box is wired. The select-box filters are
      // placeholders today (see TODO above the log-toolbar).
      const q = (this.logSearch || "").trim().toLowerCase();
      if (!q) return this.reversedLog;
      return this.reversedLog.filter((e: AiServerLogEntry) => {
        const hay = `${e.sql || ''} ${(e as any).tool || ''}`.toLowerCase();
        return hay.includes(q);
      });
    },
    // Install step 3: connected once a call lands — or a client checks in —
    // after the user reached the verify step.
    verifyConnected(): boolean {
      const seenAt = this.installStep3SeenAt;
      if (seenAt == null) return false;
      const loggedCall = (this.log ?? []).some((e: AiServerLogEntry) => e.ts >= seenAt);
      const clientActive = (this.clients ?? []).some(
        (c: { status: string; lastSeen: number }) => c.status === "approved" && c.lastSeen >= seenAt
      );
      return loggedCall || clientActive;
    },
  },
  watch: {
    options: {
      immediate: true,
      handler(next: AiServerOptions) {
        if (next) this.localOptions = { ...next };
      },
    },
    installStep: {
      immediate: true,
      handler(step: number) {
        // Stamp the moment the user reaches Verify so we only count calls
        // that arrive afterwards.
        if (step === 3) this.installStep3SeenAt = Date.now();
      },
    },
  },
  async mounted() {
    this.$root.$on(AppEvent.openAiServerPanel, this.open);
    await this.$store.dispatch("aiServer/initialize");
    this.statusListenerId = this.$util.addListener("aiServerStatusChanged", (status: AiServerStatusWithToken) => {
      this.$store.dispatch("aiServer/receiveStatusPush", status);
    });
    this.logListenerId = this.$util.addListener("aiServerLogAppend", (entry: AiServerLogEntry) => {
      this.$store.dispatch("aiServer/receiveLogPush", entry);
    });
  },
  beforeDestroy() {
    this.$root.$off(AppEvent.openAiServerPanel, this.open);
    if (this.statusListenerId) this.$util.removeListener(this.statusListenerId);
    if (this.logListenerId) this.$util.removeListener(this.logListenerId);
    if (this.flushGrantsSave) this.flushGrantsSave();
  },
  created() {
    const debounced = _.debounce((grants: AiServerGrants) => {
      this.$store.dispatch("aiServer/saveGrants", grants).catch((e: Error) => {
        this.$noty.error(`Could not save allowlist: ${e.message}`);
      });
    }, 350);
    this.queueGrantsSave = debounced;
    this.flushGrantsSave = debounced.flush;
  },
  methods: {
    open() {
      this.$modal.show(this.modalName);
      this.refreshLog();
      this.$store.dispatch("aiServer/loadClients").catch(() => { /* ignore */ });
    },
    close() { this.$modal.hide(this.modalName); },
    async start() {
      this.busy = true;
      try {
        await this.$store.dispatch("aiServer/start");
        this.$noty.success("AI server started");
      } catch (e: any) { this.$noty.error(`Could not start: ${e.message}`); }
      finally { this.busy = false; }
    },
    async stop() {
      this.busy = true;
      try { await this.$store.dispatch("aiServer/stop"); this.$noty.info("AI server stopped"); }
      catch (e: any) { this.$noty.error(`Could not stop: ${e.message}`); }
      finally { this.busy = false; }
    },
    async regenerateToken() {
      if (!await this.$confirm("Generate a new token? Existing AI clients will need it.")) return;
      this.busy = true;
      try { await this.$store.dispatch("aiServer/regenerateToken"); }
      catch (e: any) { this.$noty.error(`Could not regenerate token: ${e.message}`); }
      finally { this.busy = false; }
    },
    async refreshLog() {
      try { await this.$store.dispatch("aiServer/loadLog", { limit: 200 }); } catch { /* ignore */ }
    },
    async clearLog() {
      try { await this.$store.dispatch("aiServer/clearLog"); } catch (e: any) { this.$noty.error(`Could not clear: ${e.message}`); }
    },
    async onRequireTokenToggle(value: boolean) {
      if (this.localOptions.bindLocal) return;
      this.localOptions = { ...this.localOptions, requireToken: value };
      await this.persistOptions();
    },
    async onBindLocalToggle(value: boolean) {
      this.localOptions = {
        ...this.localOptions,
        bindLocal: value,
        requireToken: value ? true : this.localOptions.requireToken,
      };
      await this.persistOptions();
    },
    // Generic toggle for the additive boolean options (autoStart, allowWrites,
    // promptForNewClients) — the ones without cross-field rules.
    async setOption(key: "autoStart" | "allowWrites" | "promptForNewClients", value: boolean) {
      this.localOptions = { ...this.localOptions, [key]: value };
      await this.persistOptions();
    },
    async approveClient(id: string) {
      try { await this.$store.dispatch("aiServer/approveClient", id); }
      catch (e: any) { this.$noty.error(`Could not approve client: ${e.message}`); }
    },
    async denyClient(id: string) {
      try { await this.$store.dispatch("aiServer/denyClient", id); }
      catch (e: any) { this.$noty.error(`Could not deny client: ${e.message}`); }
    },
    async revokeClient(id: string) {
      try { await this.$store.dispatch("aiServer/revokeClient", id); }
      catch (e: any) { this.$noty.error(`Could not revoke client: ${e.message}`); }
    },
    async persistOptions() {
      this.busy = true;
      try {
        await this.$store.dispatch("aiServer/saveOptions", this.localOptions);
      } catch (e: any) {
        this.$noty.error(`Could not save settings: ${e.message}`);
        this.localOptions = { ...this.options };
      } finally {
        this.busy = false;
      }
    },
    formatTime(ts: number): string { try { return new Date(ts).toLocaleTimeString(); } catch { return ""; } },
    async copy(text: string | null | undefined) {
      if (!text) return;
      try { await navigator.clipboard.writeText(text); this.$noty.success("Copied"); }
      catch { this.$noty.error("Copy failed"); }
    },
    dbColor(type?: string): string {
      if (!type) return "rgba(255,255,255,0.25)";
      return DB_COLORS[type.toLowerCase()] || "rgba(255,255,255,0.25)";
    },
    toggleLogRow(id: string | number) {
      this.selectedLogId = this.selectedLogId === id ? null : (id as string);
    },
    stepClass(n: 1 | 2 | 3): string {
      if (this.installStep > n) return "done";
      if (this.installStep === n) return "active";
      return "";
    },
  } as any,
});
</script>

<style lang="scss" scoped>
// Scoped: every selector below is rewritten by Vue's scoped-CSS attribute,
// so generic names like .section, .switch, .btn cannot bleed into the rest
// of the app. The outer .ai-server-modal-content wrapper makes the scope
// obvious to readers, too.

::v-deep(.v--modal.ai-server-modal),
::v-deep(.ai-server-modal .v--modal) {
  // Wider + taller shell. Preserved from the original modal.
  width: min(54rem, 92vw) !important;
  max-width: min(54rem, 92vw) !important;
  height: min(50rem, 90vh) !important;
  max-height: min(50rem, 90vh) !important;
}

.ai-server-modal {
  .dialog-content {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
}

.ai-server-modal-content {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

.ai-modal-head {
  display: flex;
  align-items: center;
  padding: 1rem 1.25rem 0;
  flex-shrink: 0;

  h2 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 500;
    color: var(--bks-text-dark, var(--text));
  }

  .close-btn {
    margin-left: auto;
  }
}

.ai-server-tabs {
  display: flex;
  gap: 4px;
  padding: 0 1.25rem;
  margin-top: 0.75rem;
  border-bottom: 1px solid var(--bks-border-color, var(--border-color, rgba(255, 255, 255, 0.1)));
  flex-shrink: 0;

  .ai-tab-link {
    height: 36px;
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    color: var(--bks-text-light, var(--text-light));
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    text-decoration: none;
  }
  .ai-tab-link:hover { color: var(--bks-text-dark, var(--text)); }
  .ai-tab-link.active {
    color: var(--bks-text-dark, var(--text));
    border-bottom-color: var(--bks-brand-primary, var(--theme-primary, var(--bks-theme-base, #5e94e6)));
  }
  .ai-tab-link .material-icons { font-size: 16px; }
}

.ai-config-alert {
  padding: 0 1.25rem;
  margin-top: 0.75rem;
  flex-shrink: 0;

  .alert { display: block; margin: 0; }
}

.ai-server-pane {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 1.25rem;
}

// ---- form primitives (locally scoped, not the design's globals) -----------
.ai-label {
  display: block;
  font-size: 0.8rem;
  color: var(--bks-text-dark, var(--text));
  margin-bottom: 0.4rem;
  font-weight: 500;

  .accent { color: var(--bks-brand-primary, var(--theme-primary)); }
}

.ai-help {
  font-size: 0.78rem;
  color: var(--bks-text-light, var(--text-light));
  line-height: 1.5;

  &.inline { margin: 0 0 0.5rem; }
  &.warn {
    display: flex;
    gap: 0.5rem;
    padding: 0.55rem 0.75rem;
    background: rgba(255, 193, 7, 0.08);
    border: 1px solid rgba(255, 193, 7, 0.25);
    border-radius: 4px;
    color: var(--bks-text-dark, var(--text));
    align-items: flex-start;
    margin-top: 0.5rem;

    .material-icons {
      font-size: 16px;
      color: var(--bks-brand-warning, var(--theme-base, #ff8d21));
    }
  }
  code {
    font-family: monospace;
    background: rgba(255, 255, 255, 0.06);
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 0.72rem;
  }
}

.ai-input {
  width: 100%;
  height: 30px;
  padding: 0 10px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--bks-border-color, var(--border-color, rgba(255, 255, 255, 0.1)));
  border-radius: 4px;
  color: var(--bks-text-dark, var(--text));
  font: inherit;
  font-size: 0.82rem;
  font-family: monospace;
  outline: none;
}
.ai-input:focus { border-color: var(--bks-input-highlight, rgba(255, 255, 255, 0.27)); }

.token-row {
  display: flex;
  gap: 6px;
  align-items: stretch;
  margin-bottom: 4px;

  .ai-input { flex: 1; }
}

.icon-btn {
  width: 30px;
  height: 30px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--bks-border-color, var(--border-color, rgba(255, 255, 255, 0.1)));
  border-radius: 4px;
  color: var(--bks-text-light, var(--text-light));
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.icon-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  color: var(--bks-text-dark, var(--text));
}
.icon-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.icon-btn .material-icons { font-size: 16px; }

// Buttons (locally scoped — won't override the app's .btn outside scope)
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 14px;
  border-radius: 6px;
  border: 1px solid var(--bks-border-color, var(--border-color, rgba(255, 255, 255, 0.1)));
  background: rgba(255, 255, 255, 0.04);
  color: var(--bks-text-dark, var(--text));
  font: inherit;
  font-size: 0.82rem;
  cursor: pointer;

  &:hover:not(:disabled) { background: rgba(255, 255, 255, 0.08); }
  &:disabled { opacity: 0.55; cursor: not-allowed; }
  .material-icons { font-size: 15px; }
}
.btn-primary {
  background: var(--bks-brand-primary, var(--theme-primary));
  color: rgba(0, 0, 0, 0.87);
  border-color: var(--bks-brand-primary, var(--theme-primary));
  font-weight: 500;
}
.btn-primary:hover:not(:disabled) { filter: brightness(0.95); }
.btn-danger {
  background: rgba(255, 93, 89, 0.12);
  border-color: rgba(255, 93, 89, 0.3);
  color: var(--bks-brand-danger, #ff5d59);
}
.btn-danger:hover:not(:disabled) { background: rgba(255, 93, 89, 0.2); }
.btn-ghost {
  background: transparent;
  border-color: transparent;
  color: var(--bks-text-light, var(--text-light));
}
.btn-ghost:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.05);
  color: var(--bks-text-dark, var(--text));
}

.btn-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}
.actions-row { margin: 0.75rem 0 1rem; }

// ---- status pill -----------------------------------------------------------
.status-row {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  flex-wrap: wrap;
}
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 22px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.01em;

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
}
.status-pill.running {
  background: rgba(21, 219, 149, 0.15);
  color: var(--bks-brand-success, #15db95);

  .dot {
    background: var(--bks-brand-success, #15db95);
    animation: ai-modal-pulse 2s ease-in-out infinite;
  }
}
.status-pill.stopped {
  background: rgba(255, 255, 255, 0.06);
  color: var(--bks-text-light, var(--text-light));

  .dot { background: var(--bks-text-light, var(--text-light)); }
}
@keyframes ai-modal-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(21, 219, 149, 0.45); }
  50%      { box-shadow: 0 0 0 5px rgba(21, 219, 149, 0); }
}
.status-url {
  font-family: monospace;
  color: var(--bks-text-dark, var(--text));
  font-size: 0.82rem;
}
.status-started {
  color: var(--bks-text-lighter, var(--text-light));
  font-size: 0.75rem;
}

// ---- sections -------------------------------------------------------------
.ai-section {
  margin-top: 1.15rem;
  padding-top: 1rem;
  border-top: 1px solid var(--bks-border-color, var(--border-color, rgba(255, 255, 255, 0.08)));

  &:first-of-type { margin-top: 0; padding-top: 0; border-top: 0; }
}
.ai-section-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.65rem;

  .h {
    font-size: 0.82rem;
    color: var(--bks-text-dark, var(--text));
    font-weight: 600;
    letter-spacing: 0.01em;
  }
  .meta {
    font-size: 0.72rem;
    color: var(--bks-text-light, var(--text-light));
    margin-left: auto;
  }
}

// ---- toggle / switch ------------------------------------------------------
.toggle-row {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.5rem 0;

  .copy { flex: 1; }
  .copy .title {
    font-size: 0.82rem;
    color: var(--bks-text-dark, var(--text));
    font-weight: 500;
  }
  .copy .desc {
    font-size: 0.72rem;
    color: var(--bks-text-light, var(--text-light));
    margin-top: 2px;
    line-height: 1.45;
  }
  .copy .desc code {
    font-family: monospace;
    background: rgba(255, 255, 255, 0.06);
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 0.7rem;
  }
}
.toggle-row.port-row {
  padding-top: 0.75rem;
  margin-top: 0.5rem;
  border-top: 1px solid var(--bks-border-color, var(--border-color, rgba(255, 255, 255, 0.08)));
}

.switch {
  width: 32px;
  height: 18px;
  flex-shrink: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  position: relative;
  cursor: pointer;
  margin-top: 2px;
  transition: background 0.15s ease-in-out;

  &::after {
    content: "";
    position: absolute;
    top: 2px;
    left: 2px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fff;
    transition: transform 0.15s ease-in-out;
  }
  &.on { background: var(--bks-brand-primary, var(--theme-primary)); }
  &.on::after { transform: translateX(14px); background: rgba(0, 0, 0, 0.8); }
  &.disabled { opacity: 0.5; cursor: not-allowed; }
}

// ---- connected-clients empty state ----------------------------------------
.clients-empty {
  display: flex;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed var(--bks-border-color, var(--border-color, rgba(255, 255, 255, 0.1)));
  border-radius: 4px;
  align-items: flex-start;

  .material-icons {
    color: var(--bks-text-lighter, var(--text-light));
    font-size: 20px;
  }
  .t {
    font-size: 0.82rem;
    color: var(--bks-text-dark, var(--text));
    font-weight: 500;
  }
  .d {
    font-size: 0.75rem;
    color: var(--bks-text-light, var(--text-light));
    margin-top: 3px;
    line-height: 1.45;
  }
}

// ---- connected-clients list -----------------------------------------------
.clients-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.client-row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.6rem 0.75rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--bks-border-color, var(--border-color, rgba(255, 255, 255, 0.1)));
  border-radius: 4px;

  .client-status {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    background: var(--bks-text-lighter, var(--text-light));

    &.approved { background: var(--bks-brand-success, #15db95); }
    &.pending {
      background: var(--bks-brand-warning, #ff8d21);
      animation: ai-modal-pulse 2s ease-in-out infinite;
    }
    &.denied { background: var(--bks-brand-danger, #ff5d59); }
  }
  .client-info { flex: 1; min-width: 0; }
  .client-name {
    font-size: 0.82rem;
    color: var(--bks-text-dark, var(--text));
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .client-meta {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-top: 2px;
    font-size: 0.7rem;
    color: var(--bks-text-light, var(--text-light));

    .sep { opacity: 0.5; }
  }
  .client-badge {
    text-transform: capitalize;
    padding: 0 6px;
    border-radius: 10px;
    font-size: 0.66rem;
    font-weight: 500;
    background: rgba(255, 255, 255, 0.08);
    color: var(--bks-text-light, var(--text-light));

    &.approved { background: rgba(21, 219, 149, 0.12); color: var(--bks-brand-success, #15db95); }
    &.pending  { background: rgba(255, 141, 33, 0.14); color: var(--bks-brand-warning, #ff8d21); }
    &.denied   { background: rgba(255, 93, 89, 0.14);  color: var(--bks-brand-danger, #ff5d59); }
  }
  .client-actions {
    display: flex;
    gap: 5px;
    flex-shrink: 0;
  }
  .client-btn {
    height: 26px;
    padding: 0 10px;
    font-size: 0.74rem;
  }
}

// ---- log toolbar + table --------------------------------------------------
.log-toolbar {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;

  .search {
    flex: 1;
    height: 28px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--bks-border-color, var(--border-color, rgba(255, 255, 255, 0.1)));
    border-radius: 4px;
    display: flex;
    align-items: center;
    padding: 0 8px;
    gap: 6px;
    min-width: 180px;

    input {
      flex: 1;
      border: 0;
      background: transparent;
      color: var(--bks-text-dark, var(--text));
      font: inherit;
      font-size: 0.82rem;
      outline: none;
    }
    input::placeholder { color: var(--bks-text-hint, var(--text-hint, rgba(255, 255, 255, 0.37))); }
    .material-icons {
      font-size: 14px;
      color: var(--bks-text-light, var(--text-light));
    }
  }

  .selectbox {
    height: 28px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--bks-border-color, var(--border-color, rgba(255, 255, 255, 0.1)));
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0 8px;
    font-size: 0.78rem;
    color: var(--bks-text, var(--text));
    cursor: not-allowed;
    opacity: 0.6;

    .material-icons { font-size: 14px; }
  }

  .tail {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.78rem;
    color: var(--bks-text-light, var(--text-light));
    cursor: pointer;

    .switch { width: 26px; height: 14px; margin-top: 0; }
    .switch::after { width: 10px; height: 10px; top: 2px; left: 2px; }
    .switch.on::after { transform: translateX(12px); }
  }

  .icon-btn { height: 28px; width: 28px; }
}

.log-empty {
  display: flex;
  gap: 0.75rem;
  padding: 1rem 1.1rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--bks-border-color, var(--border-color, rgba(255, 255, 255, 0.1)));
  border-radius: 6px;
  align-items: flex-start;

  .material-icons {
    color: var(--bks-text-lighter, var(--text-light));
    font-size: 22px;
  }
  .t {
    font-size: 0.82rem;
    color: var(--bks-text-dark, var(--text));
    font-weight: 500;
  }
  .d {
    font-size: 0.75rem;
    color: var(--bks-text-light, var(--text-light));
    margin-top: 4px;
    line-height: 1.45;
  }
}

.log-table {
  border: 1px solid var(--bks-border-color, var(--border-color, rgba(255, 255, 255, 0.1)));
  border-radius: 6px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.2);
}
.log-row {
  display: grid;
  grid-template-columns: 96px 1.2fr 1fr 80px 20px;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  font-size: 0.78rem;
  color: var(--bks-text, var(--text));
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  cursor: pointer;
  font-family: monospace;

  &:last-child { border-bottom: 0; }
  &:hover { background: rgba(255, 255, 255, 0.025); }
  &.selected { background: rgba(250, 216, 59, 0.06); }
  &.error { background: rgba(255, 80, 80, 0.04); }

  .time {
    color: var(--bks-text-lighter, var(--text-light));
    font-size: 0.75rem;
  }
  .tool {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--bks-text-dark, var(--text));
    .material-icons {
      font-size: 14px;
      color: var(--bks-brand-secondary, var(--theme-secondary, #4ad0ff));
    }
  }
  .conn {
    color: var(--bks-text, var(--text));
    font-size: 0.75rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .conn-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .dur {
    color: var(--bks-text-light, var(--text-light));
    font-size: 0.72rem;
    text-align: right;
  }
  .stat .material-icons { font-size: 14px; }
  .stat.ok .material-icons { color: var(--bks-brand-success, #15db95); }
  .stat.err .material-icons { color: var(--bks-brand-danger, #ff5d59); }
}

.log-detail {
  padding: 0.9rem 1rem;
  background: rgba(0, 0, 0, 0.35);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);

  .grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;
    margin-bottom: 0.6rem;
  }
  .k {
    color: var(--bks-text-lighter, var(--text-light));
    text-transform: uppercase;
    font-size: 0.66rem;
    letter-spacing: 0.04em;
    margin-bottom: 2px;
  }
  .v {
    color: var(--bks-text-dark, var(--text));
    font-family: monospace;
    font-size: 0.75rem;
  }
  .sql {
    margin: 0;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 4px;
    padding: 0.6rem 0.75rem;
    font-family: monospace;
    font-size: 0.75rem;
    color: var(--bks-text-dark, var(--text));
    line-height: 1.6;
    white-space: pre-wrap;
    max-height: 14rem;
    overflow: auto;
  }
  .error-box {
    margin-top: 8px;
    padding: 0.5rem 0.75rem;
    background: rgba(255, 93, 89, 0.08);
    border: 1px solid rgba(255, 93, 89, 0.2);
    border-radius: 4px;
    color: var(--bks-brand-danger, #ff5d59);
    font-family: monospace;
    font-size: 0.75rem;
  }
}

.badge {
  display: inline-block;
  padding: 0 0.4em;
  border-radius: 999px;
  font-size: 0.7rem;
}
.badge.truncated {
  background: rgba(255, 180, 40, 0.25);
  color: var(--bks-brand-warning, #b27500);
  margin-left: 0.25rem;
}

// ---- install stepper -----------------------------------------------------
.stepper {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 1.4rem;

  .step {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--bks-text-lighter, var(--text-light));
    font-size: 0.78rem;
  }
  .step .num {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.06);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 500;
    border: 1px solid var(--bks-border-color, var(--border-color, rgba(255, 255, 255, 0.1)));
  }
  .step.active { color: var(--bks-text-dark, var(--text)); }
  .step.active .num {
    background: var(--bks-brand-primary, var(--theme-primary));
    color: rgba(0, 0, 0, 0.87);
    border-color: var(--bks-brand-primary, var(--theme-primary));
  }
  .step.done { color: var(--bks-text, var(--text)); }
  .step.done .num {
    background: rgba(21, 219, 149, 0.15);
    color: var(--bks-brand-success, #15db95);
    border-color: rgba(21, 219, 149, 0.4);
  }
  .step.done .num .material-icons { font-size: 14px; }
  .seg {
    flex: 1;
    height: 1px;
    background: var(--bks-border-color, var(--border-color, rgba(255, 255, 255, 0.1)));
    max-width: 32px;
  }
}

.client-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.6rem;
  margin-bottom: 0.85rem;

  .client-card {
    border: 1px solid var(--bks-border-color, var(--border-color, rgba(255, 255, 255, 0.1)));
    border-radius: 8px;
    padding: 0.85rem;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.02);
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;

    &:hover {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.18);
    }
    &.selected {
      border-color: var(--bks-brand-primary, var(--theme-primary));
      background: rgba(250, 216, 59, 0.05);
    }
    .logo {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      overflow: hidden;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .logo ::v-deep svg { width: 100%; height: 100%; display: block; }
    .info { flex: 1; min-width: 0; }
    .info .name {
      font-size: 0.85rem;
      color: var(--bks-text-dark, var(--text));
      font-weight: 500;
    }
    .info .desc {
      font-size: 0.72rem;
      color: var(--bks-text-light, var(--text-light));
      margin-top: 2px;
    }
  }
}

// ---- code block ----------------------------------------------------------
.codeblock {
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid var(--bks-border-color, var(--border-color, rgba(255, 255, 255, 0.1)));
  border-radius: 6px;
  padding: 0.75rem 0.85rem;
  font-family: monospace;
  font-size: 0.78rem;
  color: var(--bks-text-dark, var(--text));
  line-height: 1.6;
  position: relative;
  margin-bottom: 0.5rem;

  pre {
    margin: 0;
    padding-right: 4.5rem;
    white-space: pre-wrap;
    word-break: break-all;
    font-family: inherit;
    font-size: inherit;
    color: inherit;
  }
  .copy-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--bks-border-color, var(--border-color, rgba(255, 255, 255, 0.1)));
    border-radius: 4px;
    padding: 4px 8px;
    color: var(--bks-text-light, var(--text-light));
    font-family: inherit;
    font-size: 0.72rem;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: var(--bks-text-dark, var(--text));
    }
    .material-icons { font-size: 13px; }
  }
}

.ai-step-h {
  margin: 1rem 0 0.35rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--bks-text-dark, var(--text));
}

.ai-subsection {
  margin-top: 1.25rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--bks-border-color, var(--border-color, rgba(255, 255, 255, 0.08)));
}

.path {
  display: inline-block;
  padding: 2px 6px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  font-family: monospace;
  word-break: break-all;
}

// ---- verify box (step 3) -------------------------------------------------
.verify-box {
  margin-top: 0.85rem;
  padding: 0.85rem 1rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--bks-border-color, var(--border-color, rgba(255, 255, 255, 0.1)));
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 0.85rem;

  .spinner {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid rgba(74, 208, 255, 0.2);
    border-top-color: var(--bks-brand-secondary, var(--theme-secondary, #4ad0ff));
    animation: ai-spin 0.8s linear infinite;
  }
  .check {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    flex-shrink: 0;
    background: var(--bks-brand-success, #15db95);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: rgba(0, 0, 0, 0.87);

    .material-icons { font-size: 14px; }
  }
  .copy { flex: 1; }
  .copy .title {
    font-size: 0.82rem;
    color: var(--bks-text-dark, var(--text));
    font-weight: 500;
  }
  .copy .desc {
    font-size: 0.72rem;
    color: var(--bks-text-light, var(--text-light));
    margin-top: 3px;
    line-height: 1.5;
  }

  &.connected {
    background: rgba(21, 219, 149, 0.06);
    border-color: rgba(21, 219, 149, 0.25);
  }
}
@keyframes ai-spin { to { transform: rotate(360deg); } }

.install-nav {
  margin-top: 1.4rem;
  justify-content: flex-end;
}

// vue-select wrap: keep the existing app dropdown style; just make sure the
// search field doesn't get squashed when wrapped in a section.
.data-select-wrap { margin-top: 0.25rem; }
</style>

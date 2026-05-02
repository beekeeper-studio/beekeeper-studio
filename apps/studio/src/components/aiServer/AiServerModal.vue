<template>
  <portal to="modals">
    <modal :name="modalName" class="vue-dialog beekeeper-modal ai-server-modal" :scrollable="true">
      <div class="dialog-content">
        <div class="dialog-c-title">
          AI Server
          <a class="close-btn btn btn-fab" href="#" @click.prevent="close">
            <i class="material-icons">clear</i>
          </a>
        </div>
        <div class="ai-server-content">
          <div class="ai-server-tabs">
            <a
              v-for="t in tabs"
              :key="t.key"
              :class="['tab-link', { active: activeTab === t.key }]"
              href="#"
              @click.prevent="activeTab = t.key"
            >{{ t.label }}</a>
          </div>

          <div class="alerts" v-if="status.configDisabled">
            <div class="alert alert-warning">
              The AI server is disabled by user config (<code>aiServer.disabled = true</code>).
              Set it to <code>false</code> in your <code>user.config.ini</code> and restart Beekeeper Studio.
            </div>
          </div>

          <!-- ===================== OVERVIEW ===================== -->
          <div v-if="activeTab === 'overview'" class="ai-server-pane">

            <section class="status-section">
              <div class="status-row">
                <span class="status-pill" :class="{ running: status.running }">
                  {{ status.running ? 'Running' : 'Stopped' }}
                </span>
                <span v-if="status.running" class="status-url">{{ serverUrl }}</span>
                <span v-if="status.startedAt" class="status-started">since {{ formattedStartedAt }}</span>
              </div>
              <div class="actions-row">
                <x-buttons>
                  <x-button
                    class="btn btn-primary"
                    :disabled="status.running || status.configDisabled || busy"
                    @click="start"
                  >Start server</x-button>
                  <x-button
                    class="btn btn-flat"
                    :disabled="!status.running || busy"
                    @click="stop"
                  >Stop server</x-button>
                  <x-button
                    v-if="status.requireToken"
                    class="btn btn-flat"
                    :disabled="!status.running || busy"
                    @click="regenerateToken"
                    v-tooltip="'Generate a new token. Existing AI sessions must be re-given the new value.'"
                  >Regenerate token</x-button>
                </x-buttons>
              </div>
            </section>

            <section v-if="status.running" class="connection-info">
              <div class="form-group">
                <label>Loopback URL</label>
                <input class="form-control" type="text" :value="loopbackUrl" readonly />
              </div>
              <div class="form-group" v-if="status.bindLocal && lanUrls.length">
                <label>LAN URLs (reachable from other devices)</label>
                <input
                  v-for="u in lanUrls"
                  :key="u"
                  class="form-control lan-url"
                  type="text"
                  :value="u"
                  readonly
                />
              </div>
              <div class="form-group" v-if="status.requireToken">
                <label>API token</label>
                <div class="token-row">
                  <input
                    class="form-control token-input"
                    :type="showToken ? 'text' : 'password'"
                    :value="status.token || ''"
                    readonly
                  />
                  <x-button class="btn btn-flat btn-icon" @click="showToken = !showToken" v-tooltip="'Reveal'">
                    <i class="material-icons">{{ showToken ? 'visibility_off' : 'visibility' }}</i>
                  </x-button>
                  <x-button class="btn btn-flat btn-icon" @click="copy(status.token)" v-tooltip="'Copy'">
                    <i class="material-icons">content_copy</i>
                  </x-button>
                </div>
                <small class="muted">
                  This token is held only in memory. It is not written to <code>ai-server.json</code>; paste it into your AI client when prompted.
                </small>
              </div>
              <div class="form-group" v-else>
                <div class="alert alert-warning">
                  <strong>Token disabled.</strong> Anyone who can reach this server can use it.
                </div>
              </div>
            </section>

            <section class="grants-section">
              <h4>Allowed connections</h4>
              <p class="muted">Pick which saved connections Claude can read and query. Empty = nothing reachable.</p>
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

              <h4>Allowed saved queries</h4>
              <p class="muted">Optional. Lets Claude reach specific favorites without giving full DB access.</p>
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
            </section>

            <details class="ai-server-settings" :open="settingsOpen">
              <summary @click="settingsOpen = !settingsOpen">Server settings</summary>
              <div class="form-group">
                <label class="checkbox-group" for="aiServer-requireToken">
                  <input
                    id="aiServer-requireToken"
                    type="checkbox"
                    :checked="localOptions.requireToken"
                    :disabled="localOptions.bindLocal || busy"
                    @change="onRequireTokenToggle($event.target.checked)"
                  />
                  Require an API token
                </label>
                <small v-if="localOptions.bindLocal" class="muted">
                  Forced on while binding to the local network.
                </small>
              </div>
              <div class="form-group">
                <label class="checkbox-group" for="aiServer-bindLocal">
                  <input
                    id="aiServer-bindLocal"
                    type="checkbox"
                    :checked="localOptions.bindLocal"
                    :disabled="busy"
                    @change="onBindLocalToggle($event.target.checked)"
                  />
                  Allow connections from the local network
                </label>
                <small class="muted">
                  Binds on <code>0.0.0.0</code> instead of <code>127.0.0.1</code>. Only enable on networks you trust.
                </small>
              </div>
            </details>
          </div>

          <!-- ===================== LOGS ===================== -->
          <div v-if="activeTab === 'log'" class="ai-server-pane">
            <div class="log-toolbar">
              <x-buttons>
                <x-button class="btn btn-flat" @click="refreshLog" :disabled="busy">Refresh</x-button>
                <x-button class="btn btn-flat" @click="clearLog" :disabled="busy">Clear</x-button>
              </x-buttons>
              <span class="muted">{{ log.length }} entries</span>
            </div>
            <table class="log-table">
              <thead>
                <tr><th>Time</th><th>Connection</th><th>SQL</th><th>Rows</th><th>Duration</th><th>Result</th></tr>
              </thead>
              <tbody>
                <tr v-for="entry in reversedLog" :key="entry.id" :class="{ error: !!entry.error }">
                  <td>{{ formatTime(entry.ts) }}</td>
                  <td>{{ entry.connectionName }}</td>
                  <td><pre class="sql">{{ entry.sql }}</pre></td>
                  <td>
                    {{ entry.rowCount }}
                    <span v-if="entry.truncated" class="badge truncated" v-tooltip="'Result truncated by max-rows cap'">cap</span>
                  </td>
                  <td>{{ entry.durationMs }}ms</td>
                  <td>
                    <span v-if="entry.error" class="badge error" v-tooltip="entry.error">error</span>
                    <span v-else class="badge ok">ok</span>
                  </td>
                </tr>
                <tr v-if="log.length === 0"><td colspan="6" class="muted">No queries yet.</td></tr>
              </tbody>
            </table>
          </div>

          <!-- ===================== INSTALL ===================== -->
          <div v-if="activeTab === 'install'" class="ai-server-pane">
            <p>
              Claude Code (and any MCP-aware agent) finds this server through the discovery file:
            </p>
            <code class="path">{{ portFilePath }}</code>

            <h4>Recommended: MCP server</h4>
            <p class="muted">
              <code>@beekeeperstudio/mcp-server</code> is published separately on npm.
              <span v-if="status.requireToken">
                Pass the token from above as an env var so the MCP process picks it up:
              </span>
              <span v-else>
                The Beekeeper server has no token, so just add it directly:
              </span>
            </p>
            <code class="curl-snippet">{{ mcpInstallCommand }}</code>
            <x-button class="btn btn-flat btn-icon" @click="copy(mcpInstallCommand)">
              <i class="material-icons">content_copy</i> Copy
            </x-button>
            <p class="muted" style="margin-top:.75rem">
              Pre-approve every Beekeeper tool with one rule under <code>permissions.allow</code> in <code>~/.claude/settings.json</code>:
            </p>
            <code class="curl-snippet">{{ mcpPermissionRule }}</code>
            <x-button class="btn btn-flat btn-icon" @click="copy(mcpPermissionRule)">
              <i class="material-icons">content_copy</i> Copy rule
            </x-button>
            <p class="muted" style="margin-top:.5rem">Or, with <code>jq</code>:</p>
            <code class="curl-snippet">{{ mcpPermissionJqCommand }}</code>
            <x-button class="btn btn-flat btn-icon" @click="copy(mcpPermissionJqCommand)">
              <i class="material-icons">content_copy</i> Copy command
            </x-button>
            <p class="muted" style="margin-top:.5rem">
              After installing and pre-approving, restart Claude Code and check <code>/mcp</code> — you should see <code>beekeeper</code> connected with no further prompts.
            </p>

            <h4>Alternative: Claude Code skill</h4>
            <p class="muted">
              The skill is a thinner wrapper that shells out via <code>Bash</code>. It works, but Claude Code may prompt before each invocation.
            </p>
            <code class="curl-snippet">{{ skillInstallCommand }}</code>
            <x-button class="btn btn-flat btn-icon" @click="copy(skillInstallCommand)">
              <i class="material-icons">content_copy</i> Copy
            </x-button>
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
} from "@/common/interfaces/IAiServer";

interface ConnLike { id: number; name: string; connectionType: string; }
interface QueryLike { id: number; title: string; database: string | null; }

export default Vue.extend({
  name: "AiServerModal",
  components: { vSelect },
  data() {
    return {
      modalName: "ai-server-modal",
      activeTab: "overview" as "overview" | "log" | "install",
      tabs: [
        { key: "overview", label: "Overview" },
        { key: "log", label: "Query log" },
        { key: "install", label: "Install" },
      ],
      busy: false,
      showToken: false,
      settingsOpen: false,
      logListenerId: null as string | null,
      statusListenerId: null as string | null,
      // Local copy of options so checkbox edits don't toggle visually before persistence.
      localOptions: { requireToken: true, bindLocal: false } as AiServerOptions,
      // Material-icon dropdown indicator for vue-select (matches the rest of the app).
      OpenIndicator: {
        render: (h: any) => h("i", { class: { "material-icons": true } }, "arrow_drop_down"),
      },
    };
  },
  computed: {
    ...mapState("aiServer", ["status", "grants", "log", "options"]),
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
      try { return new Date(this.status.startedAt).toLocaleString(); } catch { return this.status.startedAt; }
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
    mcpInstallCommand(): string {
      const t = (this.status as AiServerStatusWithToken).token;
      if (this.status.requireToken && t) {
        return `BEEKEEPER_AI_SERVER_TOKEN='${t}' claude mcp add --scope user beekeeper --env BEEKEEPER_AI_SERVER_TOKEN -- npx -y @beekeeperstudio/mcp-server`;
      }
      if (this.status.requireToken) {
        return `BEEKEEPER_AI_SERVER_TOKEN=<paste from above> claude mcp add --scope user beekeeper --env BEEKEEPER_AI_SERVER_TOKEN -- npx -y @beekeeperstudio/mcp-server`;
      }
      return "claude mcp add --scope user beekeeper -- npx -y @beekeeperstudio/mcp-server";
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
  },
  watch: {
    options: {
      immediate: true,
      handler(next: AiServerOptions) {
        // Mirror the persisted options into the local checkbox state.
        if (next) this.localOptions = { ...next };
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
    // Make sure pending grant edits are flushed.
    if (this.flushGrantsSave) this.flushGrantsSave();
  },
  // Bind debounced helpers as instance methods so they survive component reuse.
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
    open() { this.$modal.show(this.modalName); this.refreshLog(); },
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
      if (this.localOptions.bindLocal) return; // forced on
      this.localOptions = { ...this.localOptions, requireToken: value };
      await this.persistOptions();
    },
    async onBindLocalToggle(value: boolean) {
      this.localOptions = {
        bindLocal: value,
        // Force token on when LAN binding is enabled.
        requireToken: value ? true : this.localOptions.requireToken,
      };
      await this.persistOptions();
    },
    async persistOptions() {
      this.busy = true;
      try {
        await this.$store.dispatch("aiServer/saveOptions", this.localOptions);
      } catch (e: any) {
        this.$noty.error(`Could not save settings: ${e.message}`);
        // Revert local copy from the persisted store value.
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
  } as any,
});
</script>

<style lang="scss" scoped>
::v-deep(.v--modal.ai-server-modal),
::v-deep(.ai-server-modal .v--modal) {
  // Wider + taller shell.
  width: min(72rem, 92vw) !important;
  max-width: min(72rem, 92vw) !important;
  height: min(48rem, 88vh) !important;
  max-height: min(48rem, 88vh) !important;
}

.ai-server-modal {
  .dialog-content {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
}

.ai-server-content {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  padding: 0 1.25rem 1.25rem;
}

.ai-server-tabs {
  display: flex;
  gap: 1.25rem;
  border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  margin-bottom: 1rem;
  flex-shrink: 0;
}
.ai-server-tabs .tab-link { padding: .5rem 0; border-bottom: 2px solid transparent; color: var(--text-light); }
.ai-server-tabs .tab-link.active { color: var(--text); border-bottom-color: var(--theme-primary, var(--bks-theme-base, #5e94e6)); }

.alerts { display: block; flex-shrink: 0; margin-bottom: 1rem; }
.alerts .alert { display: block; }

.ai-server-pane {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: .25rem 0 1rem;
}

.status-section { margin-bottom: 1.25rem; }
.status-row { display: flex; gap: 1rem; align-items: center; margin-bottom: .75rem; flex-wrap: wrap; }
.status-pill { padding: .25rem .75rem; border-radius: 999px; background: rgba(180, 180, 180, .18); color: var(--text-light); font-size: .85em; }
.status-pill.running { background: rgba(80, 180, 90, .18); color: #2a8d3a; }
.status-url { font-family: monospace; }
.status-started { color: var(--text-light); font-size: .9em; }
.actions-row x-buttons { display: inline-flex; gap: .5rem; flex-wrap: wrap; }

.connection-info { margin-bottom: 1.5rem; }
.connection-info .form-group + .form-group { margin-top: .75rem; }
.token-row { display: flex; gap: .25rem; align-items: center; }
.token-row .token-input { flex: 1; font-family: monospace; }
.lan-url + .lan-url { margin-top: .25rem; }

.grants-section { margin-bottom: 1.5rem; }
.grants-section h4 { margin: .25rem 0 .25rem; }
.grants-section h4 + p { margin-top: 0; margin-bottom: .5rem; }
.grants-section .data-select-wrap { margin-bottom: 1rem; }

.ai-server-settings {
  border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  padding-top: .75rem;
  summary {
    cursor: pointer;
    list-style: none;
    font-weight: 600;
    margin-bottom: .75rem;
  }
  summary::before {
    content: "›";
    display: inline-block;
    margin-right: .5rem;
    transition: transform .15s ease;
  }
  &[open] summary::before { transform: rotate(90deg); }
}

.curl-snippet, .path {
  display: block;
  padding: .5rem .65rem;
  margin: .25rem 0 .5rem;
  background: var(--input-bg, rgba(0, 0, 0, .15));
  border-radius: 4px;
  font-family: monospace;
  word-break: break-all;
  font-size: .85em;
}

.log-toolbar {
  display: flex;
  gap: .75rem;
  align-items: center;
  margin-bottom: .75rem;
}
.log-table { width: 100%; border-collapse: collapse; }
.log-table th, .log-table td {
  text-align: left;
  padding: .35rem .5rem;
  border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, .08));
  vertical-align: top;
}
.log-table pre.sql { margin: 0; font-size: .8em; max-height: 6em; overflow: auto; white-space: pre-wrap; }
.log-table tr.error { background: rgba(255, 80, 80, 0.05); }

.badge { display: inline-block; padding: 0 .4em; border-radius: 999px; font-size: .75em; }
.badge.ok { background: rgba(80, 180, 90, .18); color: #2a8d3a; }
.badge.error { background: rgba(255, 80, 80, .18); color: #d33; }
.badge.truncated { background: rgba(255, 180, 40, .25); color: #b27500; margin-left: .25rem; }

.muted { color: var(--text-light); font-size: .9em; }
</style>

<template>
  <portal to="modals">
    <modal :name="modalName" class="vue-dialog beekeeper-modal ai-server-modal">
      <div class="dialog-content">
        <div class="dialog-c-title">AI Server</div>
        <a class="close-btn btn btn-fab" href="#" @click.prevent="close">
          <i class="material-icons">clear</i>
        </a>
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

          <div v-if="activeTab === 'overview'" class="ai-server-pane">
            <div class="status-row">
              <span class="status-pill" :class="{ running: status.running }">
                {{ status.running ? 'Running' : 'Stopped' }}
              </span>
              <span v-if="status.running" class="status-url">{{ serverUrl }}</span>
              <span v-if="status.startedAt" class="status-started">since {{ formattedStartedAt }}</span>
            </div>

            <div class="actions-row">
              <button
                class="btn btn-primary"
                :disabled="status.running || status.configDisabled || busy"
                @click="start"
              >Start server</button>
              <button class="btn btn-flat" :disabled="!status.running || busy" @click="stop">Stop server</button>
              <button
                class="btn btn-flat"
                :disabled="!status.running || busy"
                @click="regenerateToken"
                v-tooltip="'Generate a new API token. Existing clients will need to re-read ai-server.json.'"
              >Regenerate token</button>
            </div>

            <div class="connection-info" v-if="status.running">
              <label>Host</label>
              <input type="text" :value="status.host" readonly />
              <label>Port</label>
              <input type="text" :value="status.port" readonly />
              <label>Token</label>
              <div class="token-row">
                <input :type="showToken ? 'text' : 'password'" :value="status.token || ''" readonly />
                <button class="btn btn-flat btn-icon" @click="showToken = !showToken">
                  <i class="material-icons">{{ showToken ? 'visibility_off' : 'visibility' }}</i>
                </button>
                <button class="btn btn-flat btn-icon" @click="copy(status.token)">
                  <i class="material-icons">content_copy</i>
                </button>
              </div>
              <label>Test command</label>
              <code class="curl-snippet">{{ curlSample }}</code>
            </div>
          </div>

          <div v-if="activeTab === 'grants'" class="ai-server-pane">
            <p class="muted">
              Choose which connections and saved queries the AI server can access. An empty allowlist means nothing is reachable.
            </p>
            <h4>Connections</h4>
            <table class="grants-table">
              <thead>
                <tr><th></th><th>Name</th><th>Type</th><th>Read-only</th><th>Max rows</th></tr>
              </thead>
              <tbody>
                <tr v-for="c in connections" :key="c.id">
                  <td><input type="checkbox" :checked="isConnAllowed(c.id)" @change="toggleConnection(c)" /></td>
                  <td>{{ c.name }}</td>
                  <td>{{ c.connectionType }}</td>
                  <td>
                    <input type="checkbox"
                      :disabled="!isConnAllowed(c.id)"
                      :checked="connReadOnly(c.id)"
                      @change="setConnReadOnly(c, $event.target.checked)" />
                  </td>
                  <td>
                    <input type="number" min="1"
                      :disabled="!isConnAllowed(c.id)"
                      :placeholder="String(defaultMaxRows)"
                      :value="connMaxRows(c.id)"
                      @input="setConnMaxRows(c, $event.target.value)" />
                  </td>
                </tr>
                <tr v-if="connections.length === 0">
                  <td colspan="5" class="muted">No saved connections.</td>
                </tr>
              </tbody>
            </table>

            <h4>Saved queries</h4>
            <table class="grants-table">
              <thead><tr><th></th><th>Title</th><th>Database</th></tr></thead>
              <tbody>
                <tr v-for="q in favoriteQueries" :key="q.id">
                  <td><input type="checkbox" :checked="isQueryAllowed(q.id)" @change="toggleQuery(q)" /></td>
                  <td>{{ q.title }}</td>
                  <td>{{ q.database }}</td>
                </tr>
                <tr v-if="favoriteQueries.length === 0">
                  <td colspan="3" class="muted">No saved queries.</td>
                </tr>
              </tbody>
            </table>

            <div class="actions-row">
              <button class="btn btn-primary" @click="saveGrants" :disabled="busy">Save allowlist</button>
            </div>
          </div>

          <div v-if="activeTab === 'log'" class="ai-server-pane">
            <div class="log-toolbar">
              <button class="btn btn-flat" @click="refreshLog" :disabled="busy">Refresh</button>
              <button class="btn btn-flat" @click="clearLog" :disabled="busy">Clear</button>
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

          <div v-if="activeTab === 'install'" class="ai-server-pane">
            <p>
              Claude Code (and any MCP-aware agent) finds this server through the discovery file:
            </p>
            <code class="path">{{ portFilePath }}</code>

            <h4>Recommended: MCP server</h4>
            <p class="muted">
              An MCP server gives Claude first-class tools (no per-call <code>Bash</code>/<code>Read</code> permission prompts). One-line install using the copy bundled with Beekeeper Studio:
            </p>
            <code class="curl-snippet">{{ mcpInstallCommandLocal }}</code>
            <button class="btn btn-flat btn-icon" @click="copy(mcpInstallCommandLocal)">
              <i class="material-icons">content_copy</i> Copy
            </button>
            <p class="muted" style="margin-top:.75rem">
              Once <code>@beekeeperstudio/mcp-server</code> is published you'll also be able to use:
            </p>
            <code class="curl-snippet">{{ mcpInstallCommandNpm }}</code>
            <button class="btn btn-flat btn-icon" @click="copy(mcpInstallCommandNpm)">
              <i class="material-icons">content_copy</i> Copy
            </button>
            <p class="muted" style="margin-top:.5rem">
              After running the command, restart Claude Code and check <code>/mcp</code> — you should see <code>beekeeper</code> connected.
            </p>

            <h4>Alternative: Claude Code skill</h4>
            <p class="muted">
              The skill is a thinner wrapper that shells out via <code>Bash</code>. It works, but Claude Code may prompt before each invocation.
            </p>
            <code class="curl-snippet">{{ installCommand }}</code>
            <button class="btn btn-flat btn-icon" @click="copy(installCommand)">
              <i class="material-icons">content_copy</i> Copy
            </button>
            <p class="muted" style="margin-top:.5rem">Bundled skill source: <code class="path">{{ bundledSkillPath }}</code></p>
            <p class="muted">
              To suppress the permission prompt, add this to <code>permissions.allow</code> in <code>~/.claude/settings.json</code> (<code>install.sh</code> does this for you when <code>jq</code> is present):
            </p>
            <code class="curl-snippet">{{ permissionRule }}</code>
            <button class="btn btn-flat btn-icon" @click="copy(permissionRule)">
              <i class="material-icons">content_copy</i> Copy
            </button>
          </div>
        </div>
      </div>
    </modal>
  </portal>
</template>

<script lang="ts">
import Vue from "vue";
import { mapState, mapGetters } from "vuex";
import { AppEvent } from "@/common/AppEvent";
import { AiServerGrants, AiServerLogEntry, AiServerStatusWithToken } from "@/common/interfaces/IAiServer";

interface ConnLike { id: number; name: string; connectionType: string; }
interface QueryLike { id: number; title: string; database: string | null; }

export default Vue.extend({
  name: "AiServerModal",
  data() {
    return {
      modalName: "ai-server-modal",
      activeTab: "overview" as "overview" | "grants" | "log" | "install",
      tabs: [
        { key: "overview", label: "Overview" },
        { key: "grants", label: "Allowlist" },
        { key: "log", label: "Query log" },
        { key: "install", label: "Install skill" },
      ],
      busy: false,
      showToken: false,
      pendingGrants: null as AiServerGrants | null,
      logListenerId: null as string | null,
      statusListenerId: null as string | null,
    };
  },
  computed: {
    ...mapState("aiServer", ["status", "grants", "log"]),
    ...mapGetters("aiServer", ["serverUrl"]),
    connections(): ConnLike[] {
      return (this.$store.state["data/connections"]?.items ?? []) as ConnLike[];
    },
    favoriteQueries(): QueryLike[] {
      return (this.$store.state["data/queries"]?.items ?? []) as QueryLike[];
    },
    workingGrants(): AiServerGrants {
      return this.pendingGrants ?? this.grants;
    },
    defaultMaxRows(): number {
      return Number(this.$bksConfig?.aiServer?.maxRows ?? 1000);
    },
    formattedStartedAt(): string {
      if (!this.status.startedAt) return "";
      try { return new Date(this.status.startedAt).toLocaleString(); } catch { return this.status.startedAt; }
    },
    curlSample(): string {
      const url = `${this.serverUrl}/v1/server/info`;
      const t = (this.status as AiServerStatusWithToken).token ?? "<token>";
      return `curl -H "Authorization: Bearer ${t}" ${url}`;
    },
    portFilePath(): string {
      const dir = this.$config?.userDirectory || "~/.config/beekeeper-studio";
      return `${dir}/ai-server.json`;
    },
    installCommand(): string {
      return "curl -fsSL https://beekeeperstudio.io/skills/install.sh | sh";
    },
    bundledSkillPath(): string {
      const dir = this.$config?.resourcesPath || "<resources>";
      return `${dir}/skills/beekeeper`;
    },
    bundledMcpPath(): string {
      const dir = this.$config?.resourcesPath || "<resources>";
      return `${dir}/mcp-server/dist/index.js`;
    },
    mcpInstallCommandLocal(): string {
      return `claude mcp add --scope user beekeeper -- node "${this.bundledMcpPath}"`;
    },
    mcpInstallCommandNpm(): string {
      return "claude mcp add --scope user beekeeper -- npx -y @beekeeperstudio/mcp-server";
    },
    permissionRule(): string {
      return "Bash(python3 ~/.claude/skills/beekeeper/beekeeper.py:*)";
    },
    reversedLog(): AiServerLogEntry[] {
      return [...this.log].reverse();
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
  },
  methods: {
    open() { this.$modal.show(this.modalName); this.refreshLog(); },
    close() { this.$modal.hide(this.modalName); },
    async start() {
      this.busy = true;
      try {
        await this.$store.dispatch("aiServer/start");
        this.$noty.success("AI server started");
      } catch (e) { this.$noty.error(`Could not start: ${e.message}`); }
      finally { this.busy = false; }
    },
    async stop() {
      this.busy = true;
      try { await this.$store.dispatch("aiServer/stop"); this.$noty.info("AI server stopped"); }
      catch (e) { this.$noty.error(`Could not stop: ${e.message}`); }
      finally { this.busy = false; }
    },
    async regenerateToken() {
      if (!await this.$confirm("Generate a new token? Existing AI clients will need to reload the port file.")) return;
      this.busy = true;
      try { await this.$store.dispatch("aiServer/regenerateToken"); }
      catch (e) { this.$noty.error(`Could not regenerate token: ${e.message}`); }
      finally { this.busy = false; }
    },
    async refreshLog() {
      try { await this.$store.dispatch("aiServer/loadLog", { limit: 200 }); } catch { /* ignore */ }
    },
    async clearLog() {
      try { await this.$store.dispatch("aiServer/clearLog"); } catch (e) { this.$noty.error(`Could not clear: ${e.message}`); }
    },
    isConnAllowed(id: number): boolean {
      return this.workingGrants.connections.some((c) => c.connectionId === id);
    },
    connReadOnly(id: number): boolean {
      return this.workingGrants.connections.find((c) => c.connectionId === id)?.readOnly !== false;
    },
    connMaxRows(id: number): string {
      return String(this.workingGrants.connections.find((c) => c.connectionId === id)?.maxRows ?? "");
    },
    isQueryAllowed(id: number): boolean {
      return this.workingGrants.queries.includes(id);
    },
    cloneGrants(): AiServerGrants {
      return {
        connections: this.workingGrants.connections.map((c) => ({ ...c })),
        queries: [...this.workingGrants.queries],
        workspaceIds: [...this.workingGrants.workspaceIds],
      };
    },
    toggleConnection(conn: ConnLike) {
      const next = this.cloneGrants();
      const i = next.connections.findIndex((c) => c.connectionId === conn.id);
      if (i >= 0) next.connections.splice(i, 1);
      else next.connections.push({ connectionId: conn.id, readOnly: true });
      this.pendingGrants = next;
    },
    setConnReadOnly(conn: ConnLike, value: boolean) {
      const next = this.cloneGrants();
      const grant = next.connections.find((c) => c.connectionId === conn.id);
      if (grant) grant.readOnly = value;
      this.pendingGrants = next;
    },
    setConnMaxRows(conn: ConnLike, raw: string) {
      const next = this.cloneGrants();
      const grant = next.connections.find((c) => c.connectionId === conn.id);
      if (grant) {
        const parsed = Number(raw);
        grant.maxRows = parsed > 0 ? parsed : undefined;
      }
      this.pendingGrants = next;
    },
    toggleQuery(q: QueryLike) {
      const next = this.cloneGrants();
      const i = next.queries.indexOf(q.id);
      if (i >= 0) next.queries.splice(i, 1);
      else next.queries.push(q.id);
      this.pendingGrants = next;
    },
    async saveGrants() {
      if (!this.pendingGrants) { this.$noty.info("No changes"); return; }
      this.busy = true;
      try {
        await this.$store.dispatch("aiServer/saveGrants", this.pendingGrants);
        this.pendingGrants = null;
        this.$noty.success("Allowlist saved");
      } catch (e) { this.$noty.error(`Could not save: ${e.message}`); }
      finally { this.busy = false; }
    },
    formatTime(ts: number): string { try { return new Date(ts).toLocaleTimeString(); } catch { return ""; } },
    async copy(text: string | null | undefined) {
      if (!text) return;
      try { await navigator.clipboard.writeText(text); this.$noty.success("Copied"); }
      catch { this.$noty.error("Copy failed"); }
    },
  },
});
</script>

<style scoped>
.ai-server-modal { width: 880px; max-width: 95vw; }
.ai-server-modal .dialog-content {
  display: flex;
  flex-direction: column;
  height: 70vh;
  max-height: 720px;
}
.ai-server-content {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  padding: 0 1rem 1rem;
}
.ai-server-tabs {
  display: flex;
  gap: 1rem;
  border-bottom: 1px solid var(--border-color, #444);
  margin-bottom: 1rem;
  flex-shrink: 0;
}
.ai-server-tabs .tab-link { padding: .5rem 0; border-bottom: 2px solid transparent; color: var(--text-light); }
.ai-server-tabs .tab-link.active { color: var(--text); border-bottom-color: var(--theme-primary, #5e94e6); }
.alerts { display: block; flex-shrink: 0; margin-bottom: 1rem; }
.alerts .alert { display: block; }
.ai-server-pane {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: .5rem 0;
}
.status-row { display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem; }
.status-pill { padding: .25rem .75rem; border-radius: 999px; background: rgba(255,80,80,.2); color: #d33; font-size: .85em; }
.status-pill.running { background: rgba(80,180,90,.2); color: #2a8d3a; }
.status-url { font-family: monospace; }
.actions-row { display: flex; gap: .5rem; margin-bottom: 1rem; }
.connection-info label { display: block; margin-top: .5rem; font-weight: 600; }
.connection-info input { width: 100%; }
.token-row { display: flex; gap: .25rem; align-items: center; }
.token-row input { flex: 1; font-family: monospace; }
.curl-snippet, .path { display: block; padding: .5rem; background: var(--input-bg, rgba(0,0,0,.05)); border-radius: 4px; font-family: monospace; word-break: break-all; }
.grants-table, .log-table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
.grants-table th, .grants-table td, .log-table th, .log-table td { text-align: left; padding: .35rem .5rem; border-bottom: 1px solid var(--border-color, rgba(0,0,0,.1)); }
.log-table pre.sql { margin: 0; font-size: .8em; max-height: 6em; overflow: auto; white-space: pre-wrap; }
.log-table tr.error { background: rgba(255, 80, 80, 0.05); }
.badge { display: inline-block; padding: 0 .4em; border-radius: 999px; font-size: .75em; }
.badge.ok { background: rgba(80,180,90,.2); color: #2a8d3a; }
.badge.error { background: rgba(255,80,80,.2); color: #d33; }
.badge.truncated { background: rgba(255,180,40,.25); color: #b27500; margin-left: .25rem; }
.muted { color: var(--text-light); font-size: .9em; }
</style>

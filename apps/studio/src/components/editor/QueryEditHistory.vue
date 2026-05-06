<template>
  <div v-if="open" class="query-edit-history">
    <section class="preview">
      <div v-if="loadingDetail && !selectedAudit" class="empty-state">
        Loading...
      </div>
      <div v-else-if="!selectedAudit && !loading" class="empty-state">
        No history yet.
      </div>
      <merge-text-editor
        v-else
        :type="connectionType === 'surrealdb' ? 'surrealdb' : 'sql'"
        :current-version="currentText"
        :previous-version="previousText"
        :language-id="languageId"
        :default-schema="defaultSchema"
        :entities="entities"
        :show-diff="showDiff"
        :clipboard="$native.clipboard"
        :replace-extensions="replaceExtensions"
      />
    </section>
    <section class="audit-list">
      <header class="sub">Query Edit History</header>
      <div v-if="error" v-text="errorMessage" class="alert alert-danger" />
      <div v-if="loading && audits.length === 0" class="empty-state">
        Loading...
      </div>
      <div v-else class="audit-groups">
        <section
          v-for="group in groupedAudits"
          :key="group.heading"
          class="audit-group"
        >
          <h3 class="group-heading">{{ group.heading }}</h3>
          <ul>
            <li
              v-for="audit in group.items"
              :key="audit.id"
              class="item-wrapper"
            >
              <button
                type="button"
                class="item"
                :aria-current="audit.id === selectedAuditId ? 'true' : 'false'"
                @click="selectAudit(audit.id)"
              >
                <time v-text="formatTime(audit.createdAt)" />
                <span class="editor-label">{{ userLabel(audit) }}</span>
                <span class="badge badge-info" v-if="isCurrentVersion(audit)">
                  Current version
                </span>
              </button>
            </li>
          </ul>
        </section>
      </div>
      <footer class="footer">
        <div>
          <label class="checkbox-group">
            <input type="checkbox" v-model="showDiff" class="form-control" />
            <span>Highlight changes</span>
          </label>
        </div>
        <div>
          <button class="btn btn-flat" type="button" @click="$emit('close')">
            Close
          </button>
          <button
            class="btn btn-primary"
            type="button"
            @click="confirmRestore"
            :disabled="isCurrentVersion() || restoring"
          >
            Restore this version
          </button>
        </div>
      </footer>
    </section>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import { mapGetters, mapState } from "vuex";
import MergeTextEditor from "@beekeeperstudio/ui-kit/vue/merge-text-editor";
import {
  IQueryAudit,
  IQueryAuditDetail,
} from "@/common/interfaces/IQueryAudit";
import ISavedQuery from "@/common/interfaces/ISavedQuery";
import { TableOrView } from "@/lib/db/models";
import { Entity } from "@beekeeperstudio/ui-kit";
import type { Extension } from "@codemirror/state";
import { monokaiInit } from "@uiw/codemirror-theme-monokai";
import rawLog from "@bksLogger";

const log = rawLog.scope("QueryEditHistory");

interface AuditGroup {
  heading: string;
  items: IQueryAudit[];
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

// ISO-style: weeks start on Monday.
function startOfWeek(d: Date): Date {
  const r = startOfDay(d);
  const day = r.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  r.setDate(r.getDate() + offset);
  return r;
}

function startOfMonth(d: Date): Date {
  const r = startOfDay(d);
  r.setDate(1);
  return r;
}

function startOfYear(d: Date): Date {
  const r = startOfDay(d);
  r.setMonth(0, 1);
  return r;
}

function bucketLabel(when: Date, now: Date): string {
  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (when >= today) return "Today";
  if (when >= yesterday) return "Yesterday";
  if (when >= startOfWeek(now)) {
    return when.toLocaleString("en-US", { weekday: "long" });
  }

  const thisMonth = startOfMonth(now);
  if (when >= thisMonth) return "This month";

  const lastMonth = new Date(thisMonth);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  if (when >= lastMonth) return "Last month";

  const thisYear = startOfYear(now);
  if (when >= thisYear) return when.toLocaleString("en-US", { month: "long" });

  const lastYear = new Date(thisYear);
  lastYear.setFullYear(lastYear.getFullYear() - 1);
  if (when >= lastYear) return "Last year";

  return "Older";
}

export default Vue.extend({
  components: { MergeTextEditor },
  props: {
    open: {
      type: Boolean,
      default: false,
    },
    queryId: {
      type: Number as PropType<number | null>,
      default: null,
    },
  },
  data() {
    return {
      audits: [] as IQueryAudit[],
      selectedAuditId: null as number | null,
      selectedAudit: null as IQueryAuditDetail | null,
      previousAudit: null as IQueryAuditDetail | null,
      loading: false,
      loadingDetail: false,
      restoring: false,
      error: null as unknown,
      showDiff: true,
    };
  },
  watch: {
    open: {
      immediate: true,
      handler(isOpen: boolean) {
        if (isOpen) {
          this.loadHistory();
        } else {
          this.resetState();
        }
      },
    },
    queryId() {
      if (this.open) {
        this.loadHistory();
      }
    },
  },
  computed: {
    ...mapState(["connectionType", "tables"]),
    ...mapGetters(["dialectData", "defaultSchema", "cloudClient"]),
    currentText(): string {
      return this.selectedAudit?.snapshot?.text ?? "";
    },
    previousText(): string {
      return this.previousAudit?.snapshot?.text ?? "";
    },
    languageId(): string | undefined {
      const mode = this.dialectData?.textEditorMode;
      return mode === "text/x-redis" ? "redis" : mode;
    },
    entities(): Entity[] {
      const tables: TableOrView[] = this.tables || [];
      return tables.map(
        (t) =>
          ({
            schema: t.schema,
            name: t.name,
            entityType: t.entityType,
          } as Entity)
      );
    },
    groupedAudits(): AuditGroup[] {
      const now = new Date();
      const groups: AuditGroup[] = [];
      let current: AuditGroup | null = null;
      // `audits` is sorted newest-first by the API, so single-pass grouping
      // also yields chronological group order (Today → Older).
      for (const audit of this.audits) {
        const heading = bucketLabel(new Date(audit.createdAt * 1000), now);
        if (!current || current.heading !== heading) {
          current = { heading, items: [] };
          groups.push(current);
        }
        current.items.push(audit);
      }
      return groups;
    },
    errorMessage(): string {
      const err = this.error;
      if (!err) {
        return "";
      }
      if (typeof err === "string") {
        return err;
      }
      if (Array.isArray(err)) {
        return err
          .map((e) => (typeof e === "string" ? e : e.message))
          .join(", ");
      }
      return (err as Error).message ?? String(err);
    },
  },
  methods: {
    async loadHistory(): Promise<void> {
      this.resetState();
      if (this.queryId == null) {
        return;
      }
      await this.loadAudits();
    },
    resetState(): void {
      this.audits = [];
      this.selectedAuditId = null;
      this.selectedAudit = null;
      this.previousAudit = null;
      this.loading = false;
      this.loadingDetail = false;
      this.restoring = false;
      this.error = null;
      this.showDiff = true;
    },
    isCurrentVersion(audit?: IQueryAudit): boolean {
      const target = audit ?? this.selectedAudit;
      if (!target || this.audits.length === 0) {
        return false;
      }
      return target.version === this.audits[0].version;
    },
    formatTime(createdAt: number): string {
      // createdAt is float seconds since epoch (cloud API convention).
      const d = new Date(createdAt * 1000);
      const month = d.toLocaleString("en-US", { month: "long" });
      const day = d.getDate();
      const time = d.toLocaleString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      if (d.getFullYear() === new Date().getFullYear()) {
        return `${month} ${day}, ${time}`;
      }
      return `${month} ${day} ${d.getFullYear()}`;
    },
    userLabel(audit: IQueryAudit): string {
      const u = audit.user || {};
      return u.name || u.username || u.email || "Unknown";
    },
    async loadAudits(): Promise<void> {
      const queryId = this.queryId;
      if (queryId == null) {
        return;
      }
      this.loading = true;
      this.error = null;
      try {
        const cli = this.cloudClient;
        if (!cli) {
          throw new Error("You are not logged in");
        }
        const audits: IQueryAudit[] = await cli.queryAudits.list(queryId);
        this.audits = audits;
        if (audits.length > 0) {
          await this.selectAudit(audits[0].id);
        } else {
          this.previousAudit = null;
          this.selectedAuditId = null;
          this.selectedAudit = null;
        }
      } catch (e) {
        this.error = e;
      } finally {
        this.loading = false;
      }
    },
    async selectAudit(auditId: number): Promise<void> {
      const queryId = this.queryId;
      if (queryId == null) {
        return;
      }
      if (auditId === this.selectedAuditId) {
        return;
      }
      this.selectedAuditId = auditId;
      this.loadingDetail = true;
      this.error = null;
      try {
        const cli = this.cloudClient;
        if (!cli) {
          throw new Error("You are not logged in");
        }
        const audits = this.audits;
        const idx = audits.findIndex((a) => a.id === auditId);
        const previousId =
          idx >= 0 && idx + 1 < audits.length ? audits[idx + 1].id : null;
        const [detail, previous] = await Promise.all([
          cli.queryAudits.get(queryId, auditId),
          previousId != null
            ? cli.queryAudits.get(queryId, previousId)
            : Promise.resolve(null),
        ]);
        // Guard against a stale response if the user clicked another row in flight.
        if (this.selectedAuditId === auditId) {
          this.selectedAudit = detail;
          this.previousAudit = previous;
        }
      } catch (e) {
        this.error = e;
      } finally {
        this.loadingDetail = false;
      }
    },
    async confirmRestore(): Promise<void> {
      const queryId = this.queryId;
      const auditId = this.selectedAuditId;
      if (queryId == null || auditId == null) {
        return;
      }
      const confirmed = await this.$confirm(
        "Restore this version?",
        "The current query text will be replaced with this revision. This will create a new entry in the edit history.",
        { confirmLabel: "Restore" }
      );
      if (!confirmed) {
        return;
      }
      this.restoring = true;
      this.error = null;
      try {
        const cli = this.cloudClient;
        if (!cli) {
          throw new Error("You are not logged in");
        }
        const restored: ISavedQuery = await cli.queryAudits.restore(
          queryId,
          auditId
        );
        this.$store.commit("data/queries/upsert", restored);
        await this.loadAudits();
        this.$emit("restore", restored);
      } catch (e) {
        log.error(e);
        this.error = e;
      } finally {
        this.restoring = false;
      }
    },
    replaceExtensions(extensions: Extension): Extension[] {
      return [
        extensions,
        monokaiInit({ settings: { selection: "", selectionMatch: "" } }),
      ];
    },
  },
});
</script>

<style scoped>
.query-edit-history {
  background-color: var(--query-editor-bg);
  display: flex;
  overflow: hidden;
}

.query-edit-history .preview {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* ::v-deep needed: merge editor renders inside a child component's scope. */
.query-edit-history ::v-deep .BksMergeTextEditor {
  min-height: 0;
  flex-grow: 1;
}

.query-edit-history .empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
  color: var(--text-lighter);
  font-size: 0.9rem;
}

.audit-list {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;

  header {
    padding: 0.5rem 1rem 0.25rem;
    color: var(--text-dark);
  }
}

.audit-groups {
  flex-grow: 1;
  overflow: auto;
}

.group-heading {
  margin: 0;
  margin-inline: 1rem;
  padding-block: 0.25rem;
  margin-top: 0.5rem;
  font-size: 1rem;
  font-weight: normal;
  color: var(--text-light);
}

.audit-list {
  .alert {
    margin-inline: 1rem;
    margin-bottom: 0.5rem;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .editor-label {
    color: var(--text-lighter);
    font-size: 0.8rem;
  }

  .badge {
    text-transform: none;
    display: flex;
    align-items: center;
    margin-inline: 0;
    margin-top: 0.25rem;
    font-size: 0.8rem;
  }

  .item {
    border: none;
    background-color: transparent;
    color: var(--text-dark);
    width: 100%;
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 0.4rem 1rem;
    font-size: 1rem;
  }
}

.query-edit-history .audit-list .item:hover {
  background-color: rgb(from var(--theme-base) r g b / 3.5%);
}

.query-edit-history .audit-list .item[aria-current="true"] {
  background-color: rgb(from var(--theme-base) r g b / 10%);
}

.query-edit-history .footer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
}

.query-edit-history .footer > div:last-child {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.query-edit-history label.checkbox-group {
  padding: 0;
  margin: 0;
}
</style>

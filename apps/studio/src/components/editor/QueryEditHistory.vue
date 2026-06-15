<template>
  <div v-if="open" class="query-edit-history">
    <section class="preview" ref="preview">
      <bk-progressbar v-show="loadingPreview" />
      <div
        v-if="selectedAuditId == null && !loadingList && !loadingPreview"
        class="empty-state"
      >
        No history yet.
      </div>
      <merge-text-editor
        v-else-if="hasPreviewContent"
        :type="connectionType === 'surrealdb' ? 'surrealdb' : 'sql'"
        :current-version="currentText"
        :previous-version="previousText"
        :language-id="languageId"
        :show-diff="showDiff"
        :clipboard="$native.clipboard"
        :replace-extensions="replaceExtensions"
      />
    </section>
    <section class="audit-list" ref="auditList">
      <header class="sub">
        <span>Query Edit History</span>
        <button
          class="close-btn btn btn-flat btn-fab"
          type="button"
          aria-label="Close"
          @click="$emit('close')"
        >
          <i class="material-icons">close</i>
        </button>
      </header>
      <div class="audit-groups">
        <bk-progressbar v-show="loadingList" />
        <section v-if="dirty" class="audit-group">
          <ul>
            <li class="item-wrapper">
              <button
                type="button"
                class="item unsaved-version"
                :aria-current="selectedAuditId === 'unsaved' ? 'true' : 'false'"
                @click="selectAudit('unsaved')"
              >
                <span class="current-version-badge">Current version</span>
                <span class="title">Currently unsaved changes</span>
              </button>
            </li>
          </ul>
        </section>
        <section
          v-for="group in groupedAudits"
          :key="group.heading"
          class="audit-group"
        >
          <h3 class="group-heading">
            {{ group.heading }}
          </h3>
          <ul>
            <li
              v-for="audit in group.items"
              :key="audit.queryAudit.id"
              class="item-wrapper"
            >
              <button
                type="button"
                class="item"
                :aria-current="
                  audit.queryAudit.id === selectedAuditId ? 'true' : 'false'
                "
                @click="selectAudit(audit.queryAudit.id)"
              >
                <span
                  class="current-version-badge"
                  v-if="audit.isCurrentVersion"
                >
                  Current version
                </span>
                <time class="title" v-text="audit.time" />
                <span class="editor-label">{{ audit.user }}</span>
              </button>
            </li>
          </ul>
        </section>
      </div>
      <div v-if="error" v-text="errorMessage" class="alert alert-danger" />
      <footer>
        <div>
          <label class="checkbox-group">
            <input type="checkbox" v-model="showDiff" class="form-control">
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
            :disabled="
              isCurrentVersion() || restoring || selectedAuditId === 'unsaved' || loadingList
            "
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
import type { Extension } from "@codemirror/state";
import { monokaiInit } from "@uiw/codemirror-theme-monokai";
import rawLog from "@bksLogger";
import Split from "split.js";

const log = rawLog.scope("QueryEditHistory");

interface AuditGroup {
  heading: string;
  items: Audit[];
}

interface Audit {
  time: string;
  user: string;
  isCurrentVersion: boolean;
  queryAudit: IQueryAudit;
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
    unsavedText: {
      type: String as PropType<string | null>,
      default: null,
    },
  },
  data() {
    return {
      queryAudits: [] as IQueryAudit[],
      selectedAuditId: null as number | "unsaved" | null,
      selectedAudit: null as IQueryAuditDetail | null,
      previousAudit: null as IQueryAuditDetail | null,
      loadingList: false,
      loadingPreview: false,
      restoring: false,
      error: null as unknown,
      showDiff: true,
      split: null as ReturnType<typeof Split> | null,
    };
  },
  watch: {
    open: {
      immediate: true,
      async handler(isOpen: boolean) {
        if (isOpen) {
          this.loadHistory();
          await this.$nextTick();
          this.initSplit();
        } else {
          this.destroySplit();
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
    ...mapGetters(["dialectData"]),
    dirty(): boolean {
      return this.unsavedText !== null;
    },
    currentText(): string {
      if (this.selectedAuditId === "unsaved") {
        return this.unsavedText ?? "";
      }
      return this.selectedAudit?.values?.text ?? "";
    },
    hasPreviewContent(): boolean {
      // Only mount the merge editor once we have content to render —
      // mounting it with empty strings causes the inner CodeMirror to
      // initialize blank and ignore subsequent prop updates.
      if (this.selectedAuditId === "unsaved") {
        return this.previousAudit !== null;
      }
      return this.selectedAudit !== null;
    },
    previousText(): string {
      return this.previousAudit?.values?.text ?? "";
    },
    languageId(): string | undefined {
      const mode = this.dialectData?.textEditorMode;
      return mode === "text/x-redis" ? "redis" : mode;
    },
    audits(): Audit[] {
      // The top entry of the saved list is the "current version" only when
      // the editor isn't dirty — when dirty, the synthetic unsaved row above
      // the list takes that role.
      return this.queryAudits.map((queryAudit: IQueryAudit, i: number) => ({
        queryAudit,
        time: this.formatTime(queryAudit.createdAt),
        user: this.userLabel(queryAudit),
        isCurrentVersion: !this.dirty && i === 0,
      }));
    },
    groupedAudits(): AuditGroup[] {
      const groups: AuditGroup[] = [];
      let current: AuditGroup | null = null;
      // `audits` is sorted newest-first by the API, so single-pass grouping
      // also yields chronological group order (newest → oldest).
      for (const audit of this.audits) {
        // createdAt is float seconds since epoch (cloud API convention).
        const heading = this.$bks.timeAgo(
          new Date(audit.queryAudit.createdAt * 1000)
        );
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
  beforeDestroy() {
    this.destroySplit();
  },
  methods: {
    initSplit() {
      if (this.split) {
        return;
      }
      const preview = this.$refs.preview as HTMLElement | undefined;
      const auditList = this.$refs.auditList as HTMLElement | undefined;
      if (!preview || !auditList) {
        return;
      }
      this.split = Split([preview, auditList], {
        sizes: [70, 30],
        minSize: [200, 200],
        gutterSize: 5,
        elementStyle: (_dim, size) => ({
          "flex-basis": `calc(${size}%)`,
        }),
      });
    },
    destroySplit() {
      if (this.split) {
        this.split.destroy();
        this.split = null;
      }
    },
    async loadHistory(): Promise<void> {
      this.resetState();
      if (this.queryId == null) {
        return;
      }
      await this.loadAudits();
    },
    resetState(): void {
      this.queryAudits = [];
      this.selectedAuditId = null;
      this.selectedAudit = null;
      this.previousAudit = null;
      this.loadingList = false;
      this.loadingPreview = false;
      this.restoring = false;
      this.error = null;
      this.showDiff = true;
    },
    isCurrentVersion(audit?: IQueryAudit): boolean {
      // When the editor is dirty, no saved audit reflects what's in the
      // editor, so restoring any of them is a meaningful action.
      if (this.dirty || this.queryAudits.length === 0) {
        return false;
      }
      const target = audit ?? this.selectedAudit;
      if (!target) {
        return false;
      }
      return target.id === this.queryAudits[0].id;
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
      this.loadingList = true;
      this.error = null;
      try {
        const queryAudits: IQueryAudit[] = await this.$store.dispatch(
          "data/queryAudits/list",
          queryId
        );
        this.queryAudits = queryAudits;
        if (queryAudits.length === 0) {
          this.previousAudit = null;
          this.selectedAuditId = null;
          this.selectedAudit = null;
        } else if (this.dirty) {
          await this.selectAudit("unsaved");
        } else {
          await this.selectAudit(queryAudits[0].id);
        }
      } catch (e) {
        this.error = e;
      } finally {
        this.loadingList = false;
      }
    },
    async selectAudit(auditId: number | "unsaved"): Promise<void> {
      const queryId = this.queryId;
      if (queryId == null) {
        return;
      }
      if (auditId === this.selectedAuditId) {
        return;
      }
      this.selectedAuditId = auditId;
      this.loadingPreview = true;
      this.error = null;
      try {
        if (auditId === "unsaved") {
          // Show editor text vs the latest saved snapshot. Reuse the
          // already-fetched detail when possible.
          const latest = this.queryAudits[0];
          const previous = latest
            ? this.previousAudit?.id === latest.id
              ? this.previousAudit
              : await this.$store.dispatch("data/queryAudits/get", {
                  queryId,
                  auditId: latest.id,
                })
            : null;
          if (this.selectedAuditId === auditId) {
            this.selectedAudit = null;
            this.previousAudit = previous;
          }
          return;
        }
        const detail: IQueryAuditDetail = await this.$store.dispatch(
          "data/queryAudits/get",
          { queryId, auditId }
        );
        const previous =
          detail.previousAuditId != null
            ? await this.$store.dispatch("data/queryAudits/get", {
                queryId,
                auditId: detail.previousAuditId,
              })
            : null;
        // Guard against a stale response if the user clicked another row in flight.
        if (this.selectedAuditId === auditId) {
          this.selectedAudit = detail;
          this.previousAudit = previous;
        }
      } catch (e) {
        this.error = e;
      } finally {
        this.loadingPreview = false;
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
        const restored: ISavedQuery = await this.$store.dispatch(
          "data/queryAudits/restore",
          { queryId, auditId }
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

.preview {
  display: flex;
  flex-direction: column;
  min-width: 0;
  position: relative;

  > .bk-progressbar {
    position: absolute;
    top: 0;
    right: 0;
  }
}

/* ::v-deep needed: merge editor renders inside a child component's scope. */
.query-edit-history ::v-deep .BksMergeTextEditor {
  min-height: 0;
  flex-grow: 1;
  padding-bottom: 0;
}

/* ::v-deep needed: split.js inserts the gutter at runtime. */
.query-edit-history ::v-deep .gutter.gutter-horizontal::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  background-color: var(--border-color);
  transform: translateX(-50%);
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
  min-width: 0;
  position: relative;

  > .bk-progressbar {
    position: absolute;
    top: 0;
    right: 0;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.5rem 0.5rem 0.5rem 1rem;
    color: var(--text-dark);
  }

  .close-btn {
    color: var(--text-light);

    .material-icons {
      font-size: 1.145rem;
    }
  }
}

.audit-groups {
  flex-grow: 1;
  overflow: auto;
}

.audit-group:not(:first-of-type) {
  margin-top: 0.5rem;
}

.group-heading {
  margin: 0;
  margin-inline: 1rem;
  padding-block: 0.25rem;
  font-size: 1rem;
  font-weight: normal;
  color: var(--text-light);
  text-transform: capitalize;
}

.unsaved-version .title {
  display: flex;
  align-items: center;
  font-style: italic;
}

.current-version-badge {
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--text);

  &::before {
    content: "";
    display: inline-block;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 9999px;
    background-color: hsl(from var(--bks-theme-primary) h s calc(l - 2));
  }
}

.audit-list {
  min-width: 20rem;

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
    gap: 0.15rem;
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

.query-edit-history {
  footer {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    padding-top: 0.75rem;

    > div:last-child {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }
  }
}

.query-edit-history label.checkbox-group {
  padding: 0;
  margin: 0;
}
</style>

<template>
  <div>
    <text-editor
      v-bind="$attrs"
      :value="value"
      @input="handleInput"
      :hint="hint"
      :mode="dialectData.textEditorMode"
      :extra-keybindings="keybindings"
      :hint-options="hintOptions"
      :columns-getter="columnsGetter"
      :context-menu-options="handleContextMenuOptions"
      :plugins="plugins"
      :auto-focus="true"
      @update:focus="$emit('update:focus', $event)"
      @update:selection="$emit('update:selection', $event)"
      @update:cursorIndex="$emit('update:cursorIndex', $event)"
      @update:cursorIndexAnchor="$emit('update:cursorIndexAnchor', $event)"
      @update:initialized="$emit('update:initialized', $event)"
    />

    <modal
    :name="fkSuggestionModalName"
    class="vue-dialog beekeeper-modal fk-name-suggestion-modal"
    width="400"
    height="auto"
    :scrollable="false"
    :adaptive="true"
    :pivot-y="0.3"
  >
    <div class="beekeeper-popup">
      <div class="popup-content">
        <div class="popup-header">
          <span class="popup-title">Suggested foreign key name:</span>
        </div>

        <div class="current-vs-suggested" v-if="currentFkName">
          <div class="current-name">
            <label>Current:</label>
            <div class="name-display current">{{ currentFkName }}</div>
          </div>
        </div>

        <div class="suggested-name-container">
          <label v-if="currentFkName">Suggested:</label>
          <div class="suggested-name-display">
            {{ suggestedFkName }}
          </div>
        </div>

        <div class="popup-actions">
          <button @click="applyFkNameAndClose" class="btn btn-primary">
            {{ currentFkName ? "Rename" : "Apply" }}
          </button>
          <button
            @click="dismissSuggestionAndClose"
            class="btn btn-secondary"
          >
            Ignore
          </button>
        </div>
      </div>
    </div>
  </modal>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import TextEditor from "./TextEditor.vue";
import { mapState, mapGetters } from "vuex";
import { plugins } from "@/lib/editor/utils";
import { format } from "sql-formatter";
import { FormatterDialect, dialectFor } from "@shared/lib/dialects/models";
import CodeMirror from "codemirror";

interface ForeignKeyInfo {
  id: string;
  fromTable: string;
  toTable: string;
  fromColumn: string;
  toColumn: string;
  currentName: string | null;
  suggestedName: string;
  position: number;
  lineNumber: number;
}

export default Vue.extend({
  components: { TextEditor },
  props: ["value", "connectionType", "extraKeybindings", "contextMenuOptions"],
  data() {
    return {
      suggestedFkName: "",
      currentFkName: "",
      currentTableName: "",
      referencedTableName: "",
      currentFkInfo: null as ForeignKeyInfo | null,
      dismissedSuggestions: new Set<string>(),
      detectedForeignKeys: [] as ForeignKeyInfo[],
      suggestionQueue: [] as ForeignKeyInfo[],
    };
  },
  computed: {
    ...mapGetters(['defaultSchema', 'dialectData', 'isUltimate']),
    ...mapState(["tables"]),
    fkSuggestionModalName() {
      return "fk-name-suggestion-modal";
    },
    hint() {
      // @ts-expect-error not fully typed
      return CodeMirror.hint.sql;
    },
    hintOptions() {
      // We do this so we can order the autocomplete options
      const firstTables = {};
      const secondTables = {};
      const thirdTables = {};

      this.tables.forEach((table) => {
        // don't add table names that can get in conflict with database schema
        if (/\./.test(table.name)) return;

        // Previously we had to provide a table: column[] mapping.
        // we don't need to provide the columns anymore because we fetch them dynamically.
        if (!table.schema) {
          firstTables[table.name] = [];
          return;
        }

        if (table.schema === this.defaultSchema) {
          firstTables[table.name] = [];
          secondTables[`${table.schema}.${table.name}`] = [];
        } else {
          thirdTables[`${table.schema}.${table.name}`] = [];
        }
      });

      const sorted = Object.assign(
        firstTables,
        Object.assign(secondTables, thirdTables)
      );

      return { tables: sorted };
    },
    keybindings() {
      return {
        "Shift-Ctrl-F": this.formatSql,
        "Shift-Cmd-F": this.formatSql,
        ...this.extraKeybindings,
      };
    },
    plugins() {
      const editorPlugins = [
        plugins.autoquote,
        plugins.autoComplete,
        plugins.autoRemoveQueryQuotes(this.queryDialect),
        plugins.queryMagic(() => this.defaultSchema, () => this.tables)
      ];

      return editorPlugins;
    },
    queryDialect() {
      return this.dialectData.queryDialectOverride ?? this.connectionType
    }
  },
  methods: {
    handleInput(newValue) {
      this.$emit("input", newValue);
      // Check for FK patterns
      this.checkForForeignKeyPatterns(newValue);
    },
    checkForForeignKeyPatterns(sqlText) {
      const foreignKeys = this.extractAllForeignKeys(sqlText);

      // Find suggestions that should be appear
      const suggestionsToShow = foreignKeys.filter((fk) => {
        // Don't show if this suggestion was already ignored
        if (this.dismissedSuggestions.has(fk.id)) {
          return false;
        }

        // Show if no constraint name exists or if current name is different from suggested
        return !fk.currentName || fk.currentName !== fk.suggestedName;
      });

      this.suggestionQueue = suggestionsToShow;

      // Show next suggestion if modal is not already open
      if (suggestionsToShow.length > 0 && !this.currentFkInfo) {
        this.showNextSuggestion();
      }
    },
    extractAllForeignKeys(sqlText): ForeignKeyInfo[] {
      const foreignKeys: ForeignKeyInfo[] = [];
      const lines = sqlText.split("\n");

      // Regex patterns
      const fkWithConstraintPattern =
        /CONSTRAINT\s+(\w+)\s+FOREIGN\s+KEY\s*\((\w+)\)\s+REFERENCES\s+(\w+)(?:\s*\((\w+)\))?/gi;
      const fkWithoutConstraintPattern =
        /(?<!CONSTRAINT\s+\w+\s+)FOREIGN\s+KEY\s*\((\w+)\)\s+REFERENCES\s+(\w+)(?:\s*\((\w+)\))?/gi;

      // Find all CREATE TABLE statements to get table contexts
      const tableContexts = this.extractTableContexts(sqlText);

      // Find FKs with constraint names
      let match;
      while ((match = fkWithConstraintPattern.exec(sqlText)) !== null) {
        const constraintName = match[1];
        const fromColumn = match[2];
        const toTable = match[3];
        const toColumn = match[4] || "id";

        const lineNumber = this.getLineNumber(sqlText, match.index);
        const fromTable = this.findTableForLine(tableContexts, lineNumber);
        const suggestedName = this.generateFkName(fromTable, toTable);

        const fkInfo: ForeignKeyInfo = {
          id: this.generateFkId(fromTable, toTable, fromColumn, toColumn),
          fromTable,
          toTable,
          fromColumn,
          toColumn,
          currentName: constraintName,
          suggestedName,
          position: match.index,
          lineNumber,
        };

        foreignKeys.push(fkInfo);
      }

      // Reset regex state
      fkWithoutConstraintPattern.lastIndex = 0;

      // Find FKs without constraint names
      while ((match = fkWithoutConstraintPattern.exec(sqlText)) !== null) {
        const fromColumn = match[1];
        const toTable = match[2];
        const toColumn = match[3] || "id";

        const lineNumber = this.getLineNumber(sqlText, match.index);
        const fromTable = this.findTableForLine(tableContexts, lineNumber);
        const suggestedName = this.generateFkName(fromTable, toTable);

        const fkInfo: ForeignKeyInfo = {
          id: this.generateFkId(fromTable, toTable, fromColumn, toColumn),
          fromTable,
          toTable,
          fromColumn,
          toColumn,
          currentName: null,
          suggestedName,
          position: match.index,
          lineNumber,
        };

        foreignKeys.push(fkInfo);
      }

      return foreignKeys;
    },
    extractTableContexts(sqlText) {
      const contexts = [];
      const lines = sqlText.split("\n");
      let currentTable = null;
      let tableStartLine = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const createTableMatch = line.match(
          /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i
        );

        if (createTableMatch) {
          // Save previous table context if exists
          if (currentTable) {
            contexts.push({
              tableName: currentTable,
              startLine: tableStartLine,
              endLine: i - 1,
            });
          }

          currentTable = createTableMatch[1];
          tableStartLine = i;
        }
      }

      // Add the last table
      if (currentTable) {
        contexts.push({
          tableName: currentTable,
          startLine: tableStartLine,
          endLine: lines.length - 1,
        });
      }

      return contexts;
    },
    findTableForLine(tableContexts, lineNumber) {
      for (const context of tableContexts) {
        if (lineNumber >= context.startLine && lineNumber <= context.endLine) {
          return context.tableName;
        }
      }
      return "table";
    },
    getLineNumber(text, position) {
      return text.substring(0, position).split("\n").length - 1;
    },
    generateFkId(fromTable, toTable, fromColumn, toColumn) {
      return `${fromTable}.${fromColumn}->${toTable}.${toColumn}`;
    },
    showNextSuggestion() {
      if (this.suggestionQueue.length === 0) {
        return;
      }

      const nextSuggestion = this.suggestionQueue[0];
      this.currentFkInfo = nextSuggestion;
      this.suggestedFkName = nextSuggestion.suggestedName;
      this.currentFkName = nextSuggestion.currentName || "";
      this.currentTableName = nextSuggestion.fromTable;
      this.referencedTableName = nextSuggestion.toTable;

      // Show the modal
      this.$modal.show(this.fkSuggestionModalName);
    },
    generateFkName(fromTable, toTable) {
      // Clean table names
      const cleanFromTable = fromTable.split(".").pop() || fromTable;
      const cleanToTable = toTable.split(".").pop() || toTable;

      return `FK_${cleanFromTable}_${cleanToTable}`;
    },
    applyFkNameAndClose() {
      if (this.currentFkInfo) {
        this.applyFkName(this.currentFkInfo);
        this.moveToNextSuggestion();
      }
    },
    applyFkName(fkInfo: ForeignKeyInfo) {
      const nameToUse = fkInfo.suggestedName;
      const currentValue = this.value;
      const lines = currentValue.split("\n");

      // Find the specific line for this FK
      const targetLine = fkInfo.lineNumber;

      if (targetLine >= 0 && targetLine < lines.length) {
        let line = lines[targetLine];

        if (fkInfo.currentName) {
          // Replace existing constraint name
          const constraintPattern = new RegExp(
            `CONSTRAINT\\s+${fkInfo.currentName}\\s+`,
            "i"
          );
          line = line.replace(constraintPattern, `CONSTRAINT ${nameToUse} `);
        } else {
          // Add constraint name before FOREIGN KEY
          const fkIndex = line.search(/FOREIGN\s+KEY/i);
          if (fkIndex >= 0) {
            const beforeFK = line.substring(0, fkIndex);
            const afterFK = line.substring(fkIndex);
            line = `${beforeFK}CONSTRAINT ${nameToUse} ${afterFK}`;
          }
        }

        lines[targetLine] = line;
        const newValue = lines.join("\n");
        this.$emit("input", newValue);
      }
    },
    dismissSuggestionAndClose() {
      if (this.currentFkInfo) {
        // Mark this suggestion as dismissed
        this.dismissedSuggestions.add(this.currentFkInfo.id);
        this.moveToNextSuggestion();
      }
    },
    moveToNextSuggestion() {
      // Remove current suggestion from queue
      this.suggestionQueue = this.suggestionQueue.slice(1);
      this.currentFkInfo = null;

      this.closeFkSuggestionModalImmediately();

      this.$nextTick(() => {
        setTimeout(() => {
          if (this.suggestionQueue.length > 0) {
            this.showNextSuggestion();
          }
        }, 100);
      });
    },
    closeFkSuggestionModalImmediately() {
      // Force immediate close
      this.$modal.hide(this.fkSuggestionModalName);
      this.$nextTick(() => {
        this.resetSuggestionData();
      });
    },
    resetSuggestionData() {
      this.suggestedFkName = "";
      this.currentFkName = "";
      this.currentTableName = "";
      this.referencedTableName = "";
    },
    formatSql() {
      const formatted = format(this.value, {
        language: FormatterDialect(dialectFor(this.queryDialect)),
      });
      this.$emit("input", formatted);
    },
    async columnsGetter(tableName: string) {
      let tableToFind = this.tables.find(
        (t) => t.name === tableName || `${t.schema}.${t.name}` === tableName
      );
      if (!tableToFind) return null;
      // Only refresh columns if we don't have them cached.
      if (!tableToFind.columns?.length) {
        await this.$store.dispatch("updateTableColumns", tableToFind);
        tableToFind = this.tables.find(
          (t) => t.name === tableName || `${t.schema}.${t.name}` === tableName
        );
      }

      return tableToFind?.columns.map((c) => c.columnName);
    },
    handleContextMenuOptions(e: unknown, options: any[]) {
      const pivot = options.findIndex((o) => o.slug === "find");
      const newOptions = [
        ...options.slice(0, pivot),
        {
          name: "Format Query",
          slug: "format",
          handler: this.formatSql,
          shortcut: this.ctrlOrCmd("shift+f"),
        },
        {
          type: "divider",
        },
        ...options.slice(pivot),
      ];

      if (this.contextMenuOptions) {
        return this.contextMenuOptions(e, newOptions);
      }

      return newOptions;
    },
  },
});
</script>

<style scoped>
.fk-name-suggestion-modal .beekeeper-popup {
  background: #1d1d1d;
  border-radius: 6px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  border: 1px solid #404040;
  overflow: hidden;
}

.popup-content {
  padding: 24px;
  color: #ffffff;
}

.popup-header {
  margin-bottom: 20px;
}

.popup-title {
  font-size: 15px;
  color: #ffffff;
  font-weight: 500;
}

.current-vs-suggested {
  margin-bottom: 24px;
}

.current-name {
  margin-bottom: 12px;
}

.current-name label {
  font-size: 12px;
  color: #999999;
  margin-bottom: 6px;
  display: block;
}

.name-display {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  color: #cccccc;
  padding: 0;
  background: transparent;
  border: none;
  word-break: break-all;
}

.name-display.current {
  color: #ffffff;
}

.suggested-name-container {
  margin-bottom: 24px;
}

.suggested-name-container label {
  font-size: 12px;
  color: #999999;
  margin-bottom: 6px;
  display: block;
  font-weight: bold;
}

.suggested-name-display {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  color: #eef1f3;
  font-weight: bold;
  background: transparent;
  border: none;
  padding: 0;
  word-break: break-all;
}

.popup-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid #404040;
}

.btn-secondary {
  background: transparent;
  color: #cccccc;
  border: 1px solid #555555;
}

.btn-secondary:hover {
  background: #404040;
  border-color: #666666;
}

.fk-name-suggestion-modal .vue-dialog {
  background: transparent !important;
}

.fk-name-suggestion-modal .dialog-content {
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
  padding: 0 !important;
  margin: 0 !important;
}

@media (max-width: 480px) {
  .popup-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
}
</style>
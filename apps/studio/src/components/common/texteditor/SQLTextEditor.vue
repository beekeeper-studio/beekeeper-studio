<template>
  <text-editor
    v-bind="$attrs"
    :value="value"
    @input="$emit('input', $event)"
    :lang="lang || 'sql'"
    :extra-keybindings="keybindings"
    :hint-options="hintOptions"
    :columns-getter="columnsGetter"
    :context-menu-options="handleContextMenuOptions"
    :forcedValue="forcedValue"
    @initialized="handleInitialized"
    @paste="handlePaste"
    @keyup="handleKeyup"
    @update:focus="$emit('update:focus', $event)"
    @update:selection="$emit('update:selection', $event)"
    @update:cursorIndex="$emit('update:cursorIndex', $event)"
    @update:initialized="$emit('update:initialized', $event)"
  />
</template>

<script lang="ts">
import Vue from "vue";
import TextEditor from "./TextEditor.vue";
import CodeMirror from "codemirror";
import { mapState } from "vuex";
import { registerAutoquote } from "@/lib/codemirror";
import { removeQueryQuotes } from "@/lib/db/sql_tools";
import { format } from "sql-formatter";
import { FormatterDialect, dialectFor } from "@shared/lib/dialects/models";

export default Vue.extend({
  components: { TextEditor },
  props: ["value", "lang", "extraKeybindings", "contextMenuOptions"],
  data() {
    return {
      forcedValue: this.value,
    };
  },
  computed: {
    ...mapState(["tables"]),
    hintOptions() {
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
  },
  methods: {
    async formatSql() {
      const formatted = format(this.value, {
        language: FormatterDialect(dialectFor(this.lang)),
      });
      await this.setEditorValue(formatted);
    },
    async columnsGetter(tableName: string) {
      const tableToFind = this.tables.find(
        (t) => t.name === tableName || `${t.schema}.${t.name}` === tableName
      );
      if (!tableToFind) return null;
      // Only refresh columns if we don't have them cached.
      if (!tableToFind.columns?.length) {
        await this.$store.dispatch("updateTableColumns", tableToFind);
      }

      return tableToFind?.columns.map((c) => c.columnName);
    },
    handleInitialized(cm: CodeMirror.Editor) {
      registerAutoquote(cm);
      this.$emit("initialized", ...arguments);
    },
    handlePaste(cm: CodeMirror.Editor, e) {
      e.preventDefault();
      let clipboard = (e.clipboardData.getData("text") as string).trim();
      clipboard = removeQueryQuotes(clipboard, this.identifyDialect);
      if (this.hasSelectedText) {
        cm.replaceSelection(clipboard, "around");
      } else {
        const cursor = cm.getCursor();
        cm.replaceRange(clipboard, cursor);
      }
    },
    handleKeyup(editor: CodeMirror.Editor, e) {
      // TODO: make this not suck
      // BUGS:
      // 1. only on periods if not in a quote
      // 2. post-space trigger after a few SQL keywords
      //    - from, join
      const triggerWords = ["from", "join"];
      const triggers = {
        "190": "period",
      };
      const space = 32;
      if (editor.state.completionActive) return;
      if (triggers[e.keyCode]) {
        // eslint-disable-next-line
        // @ts-ignore
        CodeMirror.commands.autocomplete(editor, null, {
          completeSingle: false,
        });
      }
      if (e.keyCode === space) {
        try {
          const pos = _.clone(editor.getCursor());
          if (pos.ch > 0) {
            pos.ch = pos.ch - 2;
          }
          const word = editor.findWordAt(pos);
          const lastWord = editor.getRange(word.anchor, word.head);
          if (!triggerWords.includes(lastWord.toLowerCase())) return;
          // eslint-disable-next-line
          // @ts-ignore
          CodeMirror.commands.autocomplete(editor, null, {
            completeSingle: false,
          });
        } catch (ex) {
          // do nothing
        }
      }
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
        ...options.slice(pivot + 1),
      ];

      if (this.contextMenuOptions) {
        return this.contextMenuOptions(e, newOptions);
      }

      return newOptions;
    },
    async setEditorValue(value: string) {
      this.forcedValue = this.value;
      await this.$nextTick();
      this.forcedValue = value;
    },
  },
});
</script>

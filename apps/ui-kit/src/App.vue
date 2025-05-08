<template>
  <div>
    <h2>TextEditor</h2>
    <text-editor
      :value="textEditorValue"
      :keymap="keymap"
      :line-wrapping="lineWrapping"
      :line-numbers="lineNumbers"
      :keybindings="keybindings"
      language-id="typescript"
      @bks-value-change="textEditorValue = $event.value"
      :ls-config="lsConfig"
      ref="textEditor"
    />
    <h2>SqlTextEditor</h2>
    <sql-text-editor
      :value="value"
      :entities="entities"
      :columns-getter="columnsGetter"
      :keymap="keymap"
      :line-wrapping="lineWrapping"
      :line-numbers="lineNumbers"
      :keybindings="keybindings"
      @bks-entities-request-columns="requestColumns"
      @bks-value-change="handleValueChange"
    />
    <h2>SqlTextEditor Legacy</h2>
    <sql-text-editor-legacy
      :value="value"
      :entities="entities"
      :columns-getter="columnsGetter"
      :keymap="keymap"
      :line-wrapping="lineWrapping"
      :line-numbers="lineNumbers"
      :keybindings="keybindings"
      @bks-entities-request-columns="requestColumns"
      @bks-value-change="handleValueChange"
    />
    <button
      @click="
        entities = [
          { name: 'users', schema: 'public', entityType: 'table', columns: [] },
        ]
      "
    >
      change entities
    </button>
  </div>
</template>

<script lang="ts">
import "../lib/components/sql-text-editor/v1/sql-text-editor.scss";
import "../lib/style.scss";
import { LanguageServerConfiguration } from "../lib/components/text-editor";
import TextEditor from "../lib/components/text-editor/v2/TextEditor.vue";
import SqlTextEditor from "../lib/components/sql-text-editor/v2/SqlTextEditor.vue";
import SqlTextEditorLegacy from "../lib/components/sql-text-editor/v1/SqlTextEditor.vue";
import _ from "lodash";

export default {
  components: { TextEditor, SqlTextEditor, SqlTextEditorLegacy },
  data() {
    return {
      textEditorValue: `function sum(a: number, b: number) {
  return a + b;
}

console.log(sum(1, 2));`,
      value: "select * from users u where u",
      entities: [
        {
          name: "users",
          schema: "public",
          entityType: "table",
          columns: [],
        },
        {
          name: "posts",
          schema: "public",
          entityType: "table",
          columns: [],
        },
      ],
      keymap: "default",
      lineWrapping: true,
      lineNumbers: true,
    };
  },
  computed: {
    keybindings() {
      return {
        "Ctrl-Enter": this.submitQuery,
        "Cmd-Enter": this.submitQuery,
      };
    },
    lsConfig(): LanguageServerConfiguration {
      // return null;
      return {
        transport: {
          wsUri: "ws://localhost:3000/server",
        },
        rootUri: __PROJECT_ROOT__ + "/tests/fixtures/",
        documentUri: __PROJECT_ROOT__ + "/tests/fixtures/script.ts",
        languageId: "typescript",
      };
    },
  },
  methods: {
    submitQuery() {
      console.log("submitQuery", this.value);
    },
    handleValueChange(detail) {
      this.value = detail.value;
    },
    async columnsGetter(tableName) {
      function wait(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }
      await wait(500);
      return ["id", "name", "email", "password"];
    },
    requestColumns(detail) {
      if (detail.entity.name === "users" && _.isEmpty(detail.entity.columns)) {
        this.entities[0].columns.push(
          { field: "id" },
          { field: "name" },
          { field: "email" },
          { field: "password" }
        );
        this.entities = [...this.entities];
      } else if (
        detail.entity.name === "posts" &&
        _.isEmpty(detail.entity.columns)
      ) {
        this.entities[1].columns.push([
          { field: "id" },
          { field: "title" },
          { field: "body" },
          { field: "user_id" },
        ]);
        this.entities = [...this.entities];
      }
    },
  },

  mounted() {
    window.ls = this.$refs.textEditor.ls()
  },
};
</script>

<template>
  <div class="json-cell-drawer">
    <template v-if="hasCell">
      <div class="header">
        <div class="header-group">
          <span class="column-name truncate" :title="columnName">{{ columnName }}</span>
          <span class="badge column-data-type" v-if="dataType">{{ dataType }}</span>
        </div>
        <div class="header-group actions">
          <span class="read-only-hint" v-if="readOnly">Read-only</span>
          <x-button
            class="menu-btn btn btn-fab"
            tabindex="0"
          >
            <i class="material-icons">more_vert</i>
            <x-menu style="--target-align:right;">
              <x-menuitem @click.prevent="reformat(2)">
                <x-label>Format</x-label>
              </x-menuitem>
              <x-menuitem @click.prevent="reformat()">
                <x-label>Minify</x-label>
              </x-menuitem>
              <x-menuitem togglable :toggled="wrapText" @click.prevent="wrapText = !wrapText">
                <x-label>Wrap Text</x-label>
              </x-menuitem>
              <x-menuitem @click.prevent="copy">
                <x-label>Copy</x-label>
              </x-menuitem>
            </x-menu>
          </x-button>
        </div>
      </div>

      <div class="text-editor-wrapper">
        <text-editor
          language-id="json"
          :value="content"
          :read-only="readOnly"
          :line-wrapping="wrapText"
          :force-initialize="reinitializeTextEditor"
          :replace-extensions="replaceExtensions"
          :fold-gutters="true"
          :line-numbers="false"
          @bks-value-change="handleValueChange"
        />
      </div>

      <span class="error-message" v-if="error">{{ error }}</span>

      <div class="footer">
        <span class="expand" />
        <button
          class="btn btn-flat btn-sm"
          @click.prevent="revert"
          :disabled="!dirty"
        >
          Revert
        </button>
        <button
          class="btn btn-primary btn-sm"
          @click.prevent="apply"
          :disabled="readOnly || error || !dirty"
        >
          Apply
        </button>
      </div>
    </template>

    <div class="empty-text" v-else>
      Double-click a JSON cell to edit it here
    </div>
  </div>
</template>

<script lang="ts">
/**
 * Edits a single json/jsonb cell as the root document, rather than showing the
 * whole row like JsonViewer does. Applying writes back through the cell's
 * setValue so it joins the normal pending-changes flow.
 */
import Vue from "vue";
import _ from "lodash";
import TextEditor from "@beekeeperstudio/ui-kit/vue/text-editor";
import { AppEvent } from "@/common/AppEvent";
import { monokaiInit } from "@uiw/codemirror-theme-monokai";
import { typedArrayToString } from "@/common/utils";
import { Languages } from "@/lib/editor/languageData";

const JsonLanguage = Languages.find((lang) => lang.name === "json");

export default Vue.extend({
  name: "JsonCellDrawer",
  components: { TextEditor },
  data() {
    return {
      hasCell: false,
      columnName: "",
      dataType: "",
      readOnly: false,
      content: "",
      dirty: false,
      error: null,
      wrapText: false,
      reinitializeTextEditor: 0,
    };
  },
  computed: {
    rootBindings() {
      return [
        { event: AppEvent.openJsonCellDrawer, handler: this.open },
        { event: AppEvent.switchingTab, handler: this.reset },
        { event: AppEvent.closingTab, handler: this.reset },
      ];
    },
  },
  created() {
    // Non-reactive on purpose: Vue 2 deep observes data(), and a CellComponent
    // transitively holds the row, column and whole table. Only setValue() is
    // ever called on it, so observing it is pure cost.
    this.cell = null;
    this.originalContent = "";
  },
  methods: {
    async open(payload) {
      this.cell = payload.cell;
      this.hasCell = true;
      this.columnName = payload.columnName;
      this.dataType = payload.dataType;
      this.readOnly = payload.readOnly;
      this.setContent(this.stringify(payload.value));
      // The sidebar pane is expanding as this fires, so the editor would
      // otherwise measure itself inside a zero-width container.
      await this.$nextTick();
      this.reinitializeTextEditor++;
    },
    reset() {
      this.cell = null;
      this.hasCell = false;
      this.columnName = "";
      this.dataType = "";
      this.readOnly = false;
      this.setContent("");
    },
    setContent(text: string) {
      this.originalContent = text;
      this.content = text;
      this.dirty = false;
      this.error = null;
    },
    handleValueChange(event) {
      this.content = event.value;
      this.dirty = this.content !== this.originalContent;
      this.validate();
    },
    // Debounced, not a computed: parsing a multi-MB document on every keystroke
    // would lock the editor. apply() re-checks before writing.
    validate: _.debounce(function () {
      // An empty editor means NULL, which is valid.
      if (this.content.trim() === "") {
        this.error = null;
        return;
      }
      try {
        JSON.parse(this.content);
        this.error = null;
      } catch (e) {
        // Not isValid(): it discards the parser's line/column.
        this.error = e.message;
      }
    }, 250),
    // jsonb often arrives already parsed, json usually as a string. Unparseable
    // values fall through as-is so bad data stays visible rather than lost.
    stringify(value) {
      if (value == null) return "";
      if (_.isTypedArray(value)) {
        value = typedArrayToString(value, this.$bksConfig.ui.general.binaryEncoding);
      }
      if (typeof value !== "string") return JSON.stringify(value, null, 2);
      try {
        return JsonLanguage.beautify(value);
      } catch {
        return value;
      }
    },
    /** Pass an indent to format, omit it to minify. */
    reformat(indent?: number) {
      try {
        this.content = indent
          ? JsonLanguage.beautify(this.content)
          : JsonLanguage.minify(this.content);
        this.dirty = this.content !== this.originalContent;
        this.reinitializeTextEditor++;
      } catch {
        // Invalid content stays put; the error message explains why.
      }
    },
    copy() {
      this.$native.clipboard.writeText(this.content);
      this.$noty.success("Copied the data to your clipboard!");
    },
    revert() {
      this.setContent(this.originalContent);
      this.reinitializeTextEditor++;
    },
    apply() {
      if (this.readOnly || this.error || !this.cell) return;
      // An empty editor means NULL rather than an empty string, matching what
      // "Set as NULL" does elsewhere.
      const trimmed = this.content.trim();
      this.cell.setValue(trimmed === "" ? null : trimmed);
      this.setContent(this.content);
    },
    replaceExtensions(extensions) {
      return [
        extensions,
        monokaiInit({
          settings: {
            selection: "",
            selectionMatch: "",
          },
        }),
      ];
    },
  },
  mounted() {
    this.registerHandlers(this.rootBindings);
  },
  beforeDestroy() {
    this.validate.cancel();
    this.unregisterHandlers(this.rootBindings);
  },
});
</script>

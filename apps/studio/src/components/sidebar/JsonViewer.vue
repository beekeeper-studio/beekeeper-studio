<template>
  <div
    class="json-viewer"
    :class="{ 'empty': empty }"
    ref="sidebar"
    v-show="!hidden"
  >
    <div class="header">
      <div
        class="header-group"
        v-show="!empty"
      >
        <div class="filter-wrap">
          <input
            class="form-control"
            type="text"
            placeholder="Filter keys by text or /regex/"
            v-model="debouncedFilter"
          >
          <button
            type="button"
            class="clear btn-link"
            @click="setFilter('')"
            v-if="filter"
          >
            <i class="material-icons">cancel</i>
          </button>
        </div>
        <x-button
          class="menu-btn btn btn-fab"
          tabindex="0"
        >
          <i class="material-icons">more_vert</i>
          <x-menu style="--target-align:right;">
            <x-menuitem
              v-for="option in menuOptions"
              :key="option.name"
              :toggled="option.checked"
              :togglable="typeof option.checked !== 'undefined'"
              @click.prevent="option.handler"
            >
              <x-label>{{ option.name }}</x-label>
            </x-menuitem>
          </x-menu>
        </x-button>
      </div>
    </div>
    <div class="text-editor-wrapper">
      <text-editor
        language-id="json"
        :fold-all="foldAll"
        :unfold-all="unfoldAll"
        :value="text"
        :force-initialize="reinitializeTextEditor + (reinitialize ?? 0)"
        :markers="markers"
        :replaceExtensions="replaceExtensions"
        :line-wrapping="wrapText"
        :line-gutters="lineGutters"
        :line-numbers="false"
        :fold-gutters="true"
      />
    </div>
    <div class="empty-text">
      Open a table to view its data
    </div>
    <json-viewer-upsell v-if="$store.getters.isCommunity" />
  </div>
</template>

<script lang="ts">
/**
 * hidden:  it's recommended to use `hidden` prop instead of v-show so that
 *          the text editor can be reinitialized.
 * dataId:  use this to update the component with new data.
 */
import Vue from "vue";
import TextEditor from "@beekeeperstudio/ui-kit/vue/text-editor"
import {
  ExpandablePath,
  findKeyPosition,
  findValueInfo,
  createExpandableTextDecoration,
  createTruncatableTextDecoration,
  deepFilterObjectProps,
  getPaths,
  eachPaths,
} from "@/lib/data/jsonViewer";
import { mapGetters } from "vuex";
import { EditorMarker, LineGutter } from "@beekeeperstudio/ui-kit";
import { persistJsonFold } from "@/lib/editor/extensions/persistJsonFold";
import { partialReadonly } from "@/lib/editor/extensions/partialReadOnly";
import JsonViewerUpsell from '@/components/upsell/JsonViewerSidebarUpsell.vue'
import rawLog from "@bksLogger";
import _ from "lodash";
import globals from '@/common/globals'
import JsonSourceMap from "json-source-map";
import JsonPointer from "json-pointer";
import { typedArrayToString } from '@/common/utils'
import { monokaiInit } from "@uiw/codemirror-theme-monokai";

const log = rawLog.scope("json-viewer");

export default Vue.extend({
  components: { TextEditor, JsonViewerUpsell },
  props: {
    value: {
      type: [Object, Array],
      default: () => ({})
    },
    hidden: {
      type: Boolean,
      default: false
    },
    expandablePaths: {
      type: Array,
      default: () => []
    },
    editablePaths: {
      type: Array,
      default: () => []
    },
    dataId: [String, Number],
    title: String,
    reinitialize: null,
    signs: {
      type: Object,
      default: () => ({})
    },
    binaryEncoding: String,
    filter: {
      type: String,
      default: ""
    },
  },
  data() {
    return {
      reinitializeTextEditor: 0,
      foldAll: 0,
      unfoldAll: 0,
      restoredTruncatedPaths: [],
      editableRangeErrors: [],
      wrapText: false,
      persistJsonFold: persistJsonFold(),
      partialReadonly: partialReadonly(),
    };
  },
  watch: {
    hidden() {
      if (!this.hidden) this.reinitializeTextEditor++;
    },
    dataId() {
      if (this.expandFKDetailsByDefault) {
        this.expandablePaths.forEach((expandablePath: ExpandablePath) => {
          // Expand only the first level
          if (expandablePath.path.length === 1) {
            this.expandPath(expandablePath);
          }
        });
      }
    },
    async text() {
      this.persistJsonFold.save()
      await this.$nextTick()
      setTimeout(() => this.persistJsonFold.apply())
    },
    editableRanges() {
      this.partialReadonly.setEditableRanges(this.editableRanges)
    },
  },
  computed: {
    sidebarTitle() {
      return this.title ?? "JSON Row Viewer"
    },
    empty() {
      return _.isEmpty(this.value);
    },
    text() {
      if (this.empty) {
        return ""
      }
      return this.sourceMap.json
    },
    debouncedFilter: {
      get() {
        return this.filter;
      },
      set: _.debounce(function (value) {
        this.setFilter(value);
      }, 500),
    },
    sourceMap() {
      // Since JsonSourceMap.stringify doesn't support replacer functions,
      // we've already applied the replacer in processedValue/filteredValue
      return JsonSourceMap.stringify(this.filteredValue, null, 2);
    },
    filteredValue() {
      if (this.empty) {
        return {}
      }
      if (!this.filter) {
        return this.processedValue
      }
      return deepFilterObjectProps(this.processedValue, this.filter);
    },
    processedValue() {
      const clonedValue = _.cloneDeep(this.value)
      eachPaths(clonedValue, (path, value) => {
        if (this.truncatedPaths.includes(path)) {
          _.set(clonedValue, path, (value as string).slice(0, globals.maxDetailViewTextLength))
        }
      })
      
      // Apply the replacer function to ensure consistency between filtered and unfiltered views
      // This is necessary because JsonSourceMap.stringify doesn't support replacer functions
      try {
        return JSON.parse(JSON.stringify(clonedValue, this.replacer));
      } catch (error) {
        log.warn("Failed to apply replacer to processed value", error);
        return clonedValue;
      }
    },
    truncatablePaths() {
      return getPaths(this.value).filter((path) => {
        const val = _.get(this.value, path)
        if (
          typeof val === "string" &&
          val.length > globals.maxDetailViewTextLength
        ) {
          return true
        }
        return false
      })
    },
    truncatedPaths() {
      return _.difference(this.truncatablePaths, this.restoredTruncatedPaths)
    },
    markers() {
      const markers: EditorMarker[] = [];
      _.forEach(this.expandablePaths, (expandablePath: ExpandablePath) => {
        try {
          const line = findKeyPosition(this.text, expandablePath.path);
          const { from, to, value } = findValueInfo(this.lines[line]);
          const onClick = () => {
            this.expandPath(expandablePath);
          };
          markers.push({
            type: "custom",
            from: { line, ch: from },
            to: { line, ch: to },
            decoration: createExpandableTextDecoration(value, onClick),
          });
        } catch (e) {
          log.warn("Failed to mark expandable path", expandablePath);
          log.warn(e);
        }
      });
      _.forEach(this.truncatedPaths, (path) => {
        // Avoid conflicts with expandable paths
        if (this.expandablePaths.includes(path)) {
          return
        }
        try {
          const line = findKeyPosition(this.text, path.split("."));
          const { from, to, value } = findValueInfo(this.lines[line]);
          const onClick = async () => {
            this.restoredTruncatedPaths.push(path)
          }
          markers.push({
            type: "custom",
            from: { line, ch: from },
            to: { line, ch: to },
            decoration: createTruncatableTextDecoration(value, onClick),
          });
        } catch (e) {
          log.warn("Failed to mark truncated path", path);
          log.warn(e);
        }
      })
      _.forEach(this.editableRangeErrors, ({ error, from, to }) => {
        markers.push({
          type: "error",
          from,
          to,
          message: error.message,
        });
      })
      return markers;
    },
    lines() {
      return this.text?.split("\n") || [];
    },
    lineGutters() {
      const lineGutters: LineGutter[] = []
      _.forEach(this.signs, (_i, key) => {
        const type = this.signs[key]
        const line = findKeyPosition(this.text, [key]);
        if (line === -1) {
          log.warn(`Failed to sign key \`${key}\`. \`${key}\` is not found.`)
          return
        }
        lineGutters.push({ line, type });
      })
      return lineGutters;
    },
    editableRanges() {
      const editablePaths = this.editablePaths

      if (_.isEmpty(editablePaths)) {
        return []
      }

      const ranges = []

      editablePaths.forEach((path: string) => {
        const pointer = JsonPointer.compile(path.split("."))
        const position = this.sourceMap.pointers[pointer]

        if (!position) {
          log.warn(`Unable to find editable path \`${path}\` in value object.`)
          return
        }

        ranges.push({
          id: path,
          from: { line: position.value.line, ch: position.value.column },
          to: { line: position.valueEnd.line, ch: position.valueEnd.column },
        })
      })

      return ranges
    },
    menuOptions() {
      return [
        {
          name: "Copy Visible",
          handler: () => {
            this.$native.clipboard.writeText(this.text);
          },
        },
        {
          name: "Collapse all",
          handler: () => {
            this.foldAll++;
          },
        },
        {
          name: "Expand all",
          handler: () => {
            this.unfoldAll++;
          },
        },
        {
          name: "Always Expand Foreign Keys",
          handler: () => {
            this.$store.dispatch("toggleExpandFKDetailsByDefault");
          },
          checked: this.expandFKDetailsByDefault,
        },
        {
          name: "Wrap Text",
          handler: () => {
            this.wrapText = !this.wrapText
          },
          checked: this.wrapText,
        },

      ]
    },
    ...mapGetters(["expandFKDetailsByDefault"]),
  },
  methods: {
    replacer(_key: string, value: unknown) {
      // HACK: this is the case in mongodb objectid
      if (value && typeof value === "object" && _.isTypedArray((value as any).buffer)) {
        return typedArrayToString((value as any).buffer, this.binaryEncoding)
      }
      if (_.isTypedArray(value)) {
        return typedArrayToString(value as ArrayBufferView, this.binaryEncoding)
      }
      return value
    },
    expandPath(path: ExpandablePath) {
      this.$emit("expandPath", path);
    },
    setFilter(filter: string) {
      this.$emit("bks-filter-change", { filter });
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
        this.persistJsonFold.extensions,
        this.partialReadonly.extensions(this.editableRanges),
      ]
    },
    handleEditableRangeChange: _.debounce(function (range, value) {
      this.editableRangeErrors = []
      try {
        const parsed = JSON.parse(value)
        this.$emit("bks-json-value-change", {key: range.id, value: parsed});
      } catch (error) {
        this.editableRangeErrors.push({ id: range.id, error, from: range.from, to: range.to })
      }
    }, 250),
  },
  mounted() {
    this.partialReadonly.addListener("change", this.handleEditableRangeChange)
  },
  beforeDestroy() {
    this.partialReadonly.removeListener("change", this.handleEditableRangeChange)
  },
});
</script>

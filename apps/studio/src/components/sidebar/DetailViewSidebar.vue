<template>
  <div
    class="sidebar detail-view-sidebar flex-col"
    ref="sidebar"
    v-show="!hidden"
  >
    <div class="header">
      <div class="header-group">
        <span class="title sub">{{ sidebarTitle }}</span>
        <button
          class="close-btn btn btn-fab"
          @click="close"
        >
          <i class="material-icons">close</i>
        </button>
      </div>
      <div
        class="header-group"
        v-show="!empty"
      >
        <div class="filter-wrap">
          <input
            class="form-control"
            type="text"
            placeholder="Filter fields"
            v-model="debouncedFilter"
          >
          <button
            type="button"
            class="clear btn-link"
            @click="filter = ''"
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
              togglable
              @click.prevent="option.handler"
            >
              <x-label>{{ option.name }}</x-label>
            </x-menuitem>
          </x-menu>
        </x-button>
      </div>
    </div>
    <text-editor
      :read-only="true"
      :fold-gutter="true"
      :fold-all="foldAll"
      :unfold-all="unfoldAll"
      :value="text"
      :mode="mode"
      :force-initizalize="reinitializeTextEditor + (reinitialize ?? 0)"
      :markers="markers"
      :plugins="textEditorPlugins"
    />
    <div class="empty-state" v-show="empty">
      No Data
    </div>
    <detail-view-sidebar-upsell v-if="$store.getters.isCommunity" />
  </div>
</template>

<script lang="ts">
/**
 * hidden:  it's recommended to use `hidden` prop instead of v-show so that
 *          the text editor can be reinitialized.
 * dataId:  use this to update the component with new data.
 */
import Vue from "vue";
import TextEditor from "@/components/common/texteditor/TextEditor.vue";
import {
  ExpandablePath,
  findKeyPosition,
  findValueInfo,
  createExpandableElement,
  createTruncatableElement,
  deepFilterObjectProps,
  getPaths,
  eachPaths,
} from "@/lib/data/detail_view";
import { mapGetters } from "vuex";
import { EditorMarker } from "@/lib/editor/utils";
import { persistJsonFold } from "@/lib/editor/plugins/persistJsonFold";
import DetailViewSidebarUpsell from '@/components/upsell/DetailViewSidebarUpsell.vue'
import rawLog from "@bksLogger";
import _ from "lodash";
import globals from '@/common/globals'

const log = rawLog.scope("detail-view-sidebar");

export default Vue.extend({
  components: { TextEditor, DetailViewSidebarUpsell },
  props: ["value", "hidden", "expandablePaths", "dataId", "title", "reinitialize"],
  data() {
    return {
      reinitializeTextEditor: 0,
      filter: "",
      foldAll: 0,
      unfoldAll: 0,
      restoredTruncatedPaths: [],
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
  },
  computed: {
    sidebarTitle() {
      return this.title ?? "JSON Row Viewer"
    },
    empty() {
      return _.isEmpty(this.value);
    },
    mode() {
      if (!this.value) {
        return null;
      }
      return { name: "javascript", json: true };
    },
    text() {
      if (this.empty) {
        return "";
      }
      if (this.filter) {
        const filtered = deepFilterObjectProps(this.processedValue, this.filter);
        return JSON.stringify(filtered, null, 2);
      }
      return JSON.stringify(this.processedValue, null, 2);
    },
    debouncedFilter: {
      get() {
        return this.filter;
      },
      set: _.debounce(function (value) {
        this.filter = value;
      }, 500),
    },
    processedValue() {
      const clonedValue = _.cloneDeep(this.value)
      eachPaths(clonedValue, (path, value) => {
        if (this.truncatedPaths.includes(path)) {
          _.set(clonedValue, path, (value as string).slice(0, globals.maxDetailViewTextLength))
        }
      })
      return clonedValue
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
          const element = createExpandableElement(value);
          const onClick = (_event) => {
            this.expandPath(expandablePath);
          };
          markers.push({
            type: "custom",
            from: { line, ch: from },
            to: { line, ch: to },
            onClick,
            element,
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
          const element = createTruncatableElement(value);
          const onClick = async () => {
            this.restoredTruncatedPaths.push(path)
            await this.$nextTick()
            this.reinitializeTextEditor++
          }
          markers.push({
            type: "custom",
            from: { line, ch: from },
            to: { line, ch: to },
            onClick,
            element,
          });
        } catch (e) {
          log.warn("Failed to mark truncated path", path);
          log.warn(e);
        }
      })
      return markers;
    },
    lines() {
      return this.text?.split("\n") || [];
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

      ]
    },
    textEditorPlugins() {
      return [persistJsonFold]
    },
    ...mapGetters(["expandFKDetailsByDefault"]),
  },
  methods: {
    expandPath(path: ExpandablePath) {
      this.$emit("expandPath", path);
    },
    close() {
      this.$emit("close")
    },
  },
});
</script>

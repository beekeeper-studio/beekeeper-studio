<template>
  <div
    class="sidebar detail-view-sidebar flex-col"
    ref="sidebar"
    v-show="!hidden"
  >
    <div class="header">
      <div class="header-group">
        <span>{{ sidebarTitle }}</span>
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
          />
          <button
            type="button"
            class="clear btn-link"
            @click="filter = ''"
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
      :forced-value="text"
      :mode="mode"
      :force-initizalize="reinitializeTextEditor + (reinitialize ?? 0)"
      :markers="markers"
    />
  </div>
</template>

<script lang="ts">
/**
 * hidden:  it's recommended to use `hidden` prop instead of v-show so that
 *          the text editor can be reinitialized.
 * dataId:  use this to update the component with new data.
 */
import Vue from "vue";
import Sidebar from "@/components/common/Sidebar.vue";
import TextEditor from "@/components/common/texteditor/TextEditor.vue";
import {
  ExpandablePath,
  findKeyPosition,
  findValueInfo,
  createExpandableElement,
  deepFilterObjectProps,
} from "@/lib/data/detail_view";
import { mapGetters } from "vuex";
import { EditorMarker } from "@/lib/editor/utils";
import rawLog from "electron-log";
import _ from "lodash";

const log = rawLog.scope("detail-view-sidebar");

export default Vue.extend({
  components: { Sidebar, TextEditor },
  props: ["value", "hidden", "expandablePaths", "dataId", "title", "reinitialize"],
  data() {
    return {
      reinitializeTextEditor: 0,
      filter: "",
      foldAll: 0,
      unfoldAll: 0,
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
      return this.title ?? "Detail View Sidebar"
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
        const filtered = deepFilterObjectProps(this.value, this.filter);
        return JSON.stringify(filtered, null, 2);
      }
      return JSON.stringify(this.value, null, 2);
    },
    debouncedFilter: {
      get() {
        return this.filter;
      },
      set: _.debounce(function (value) {
        this.filter = value;
      }, 500),
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
          // log.warn("Failed to find position for", expandablePath.path);
          // log.warn(e);
        }
      });
      return markers;
    },
    lines() {
      return this.text?.split("\n") || [];
    },
    menuOptions() {
      return [
        {
          name: "Expand FK by default",
          handler: () => {
            this.$store.dispatch("toggleExpandFKDetailsByDefault");
          },
          checked: this.expandFKDetailsByDefault,
        },
        {
          name: "Fold all",
          handler: () => {
            this.foldAll++;
          },
        },
        {
          name: "Unfold all",
          handler: () => {
            this.unfoldAll++;
          },
        },
        {
          name: "Copy",
          handler: () => {
            this.$native.clipboard.writeText(this.text);
          },
        },
        {
          name: "Close",
          handler: this.close,
        },
      ]
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

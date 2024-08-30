<template>
  <div
    class="sidebar detail-view-sidebar flex-col"
    ref="sidebar"
    v-show="!hidden"
  >
    <div class="header">
      <!-- <div class="sub">Detail view</div> -->
      <input
        class="form-control"
        type="text"
        placeholder="Filter fields"
        v-model="filter"
      />
      <span
        class="arrow-down-btn btn btn-fab"
        @click.prevent="openMenu"
        tabindex="0"
      >
        <i class="material-icons">keyboard_arrow_down</i>
      </span>
    </div>
    <text-editor
      :read-only="true"
      :fold-gutter="true"
      :fold-all="foldAll"
      :unfoldAll="unfoldAll"
      :value="text || 'Click on a row to see details'"
      :forced-value="text || 'Click on a row to see details'"
      :mode="mode"
      :force-initizalize="reinitializeTextEditor"
      :markers="markers"
    />
  </div>
</template>

<script lang="ts">
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
  props: ["value", "hidden", "expandablePaths", "rowId"],
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
    rowId() {
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
    mode() {
      if (!this.value) {
        return null;
      }
      return { name: "javascript", json: true };
    },
    text() {
      if (!this.value) {
        return "";
      }
      if (this.filter) {
        const filtered = deepFilterObjectProps(this.value, this.filter);
        return JSON.stringify(filtered, null, 2);
      }
      return JSON.stringify(this.value, null, 2);
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
    ...mapGetters(["expandFKDetailsByDefault"]),
  },
  methods: {
    expandPath(path: ExpandablePath) {
      this.$emit("expandPath", path);
    },
    openMenu(event) {
      this.$bks.openMenu({
        event,
        options: [
          {
            name: "Expand FK by default",
            handler: () => {
              this.$store.dispatch("toggleExpandFKDetailsByDefault");
            },
            icon: this.expandFKDetailsByDefault ? "done" : "",
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
            handler: () => this.$emit("close"),
          },
        ],
      });
    },
  },
});
</script>

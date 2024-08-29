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
        placeholder="Search fields"
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
      :value="text || 'Click on a row to see details'"
      :forced-value="text || 'Click on a row to see details'"
      :mode="mode"
      :force-initizalize="reinitializeTextEditor"
      :bookmarks="bookmarks"
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
  createExpandBtn,
} from "@/lib/data/detail_view";
import { mapGetters } from "vuex";

export default Vue.extend({
  components: { Sidebar, TextEditor },
  props: ["value", "hidden", "expandablePaths", "rowId"],
  data() {
    return {
      reinitializeTextEditor: 0,
      filter: "",
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
        const filtered = {};
        for (const key in this.value) {
          const keySearch = key.toLowerCase();
          const filterSearch = this.filter.toLowerCase();
          if (keySearch.includes(filterSearch)) {
            filtered[key] = this.value[key];
          }
        }
        return JSON.stringify(filtered, null, 2);
      }
      return JSON.stringify(this.value, null, 2);
    },
    bookmarks() {
      if (!this.text) return [];
      return this.expandablePaths.map((expandablePath: ExpandablePath) => {
        const line = findKeyPosition(this.text, expandablePath.path);
        // Put the bookmark at the end of the line
        const ch = this.lines[line].length;
        const element = createExpandBtn();
        const onClick = () => {
          element.disabled = true;
          this.expandPath(expandablePath);
        };
        return { line, ch, element, onClick };
      });
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

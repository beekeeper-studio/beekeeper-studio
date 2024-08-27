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
      :forced-value="text"
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

export default Vue.extend({
  components: { Sidebar, TextEditor },
  props: ["value", "hidden", "expandablePaths"],
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
      return this.expandablePaths.map((path: string[]) => {
        const line = this.findKeyPosition(this.text, path);
        // Put the element at the end of the line
        const ch = this.lines[line].length;
        const element = this.createExpandBtn();
        const onClick = () => {
          element.disabled = true;
          this.$emit("expandPath", path);
        };
        return { line, ch, element, onClick };
      });
    },
    lines() {
      return this.text?.split("\n") || [];
    },
  },
  methods: {
    /**
     * Find a line position of a key in a JSON string.
     *
     * We expect the default format of `JSON.stringify` that every key in the
     * JSON string to be enclosed in double quotes and to be separated by a
     * line break.
     */
    findKeyPosition(jsonStr: string, path: string[]) {
      const lines = jsonStr.split("\n");

      for (let i = 0; i < path.length; i++) {
        const key = path[i];
        const startsWithKey = new RegExp(`^\\s*"${key}"\\s*:`);
        const lineIndex = lines.findIndex((line) => startsWithKey.test(line));
        if (lineIndex !== -1) {
          return lineIndex;
        }
      }

      return -1; // If the path is not found
    },
    createExpandBtn() {
      const expandBtn = document.createElement("button");
      const icon = document.createElement("i");
      icon.classList.add("material-icons");
      icon.innerText = "unfold_more";
      expandBtn.appendChild(icon);
      expandBtn.classList.add("btn", "btn-flat", "btn-fab", "expand-btn");
      return expandBtn;
    },
    openMenu(event) {
      this.$bks.openMenu({
        event,
        options: [
          {
            // TODO use this Expand FK data by default
            name: "Show FK data",
            slug: "show-fk-data",
            handler: () => {
              throw new Error("not implemented");
            },
          },
          {
            name: "Filter type",
            slug: "filter-type",
            handler: () => {
              throw new Error("not implemented");
            },
          },
          { type: "divider" },
          {
            name: "Copy as JSON",
            slug: "copy-as-json",
            handler: () => {
              this.$native.clipboard.writeText(this.text);
            },
          },
          {
            name: "Close",
            slug: "close",
            handler: () => this.$emit("close"),
          },
        ],
      });
    },
  },
});
</script>

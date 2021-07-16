<template>
  <!-- the class is doing -->
  <div class="schema-wrapper">
    <explorer-list-dir
      v-for="dir in directories"
      :key="dir.name"
      :node="dir"
      :depth="0"
    ></explorer-list-dir>

    <explorer-list-file
      v-for="file in files"
      :key="file.name"
      :file="file"
      :currentNode="currentNode"
      :currentDir="currentDir"
      @selectFile="selectFile"
    ></explorer-list-file>
  </div>
</template>

<script type="text/javascript">
import explorer_actions from "@/mixins/explorer_actions";
import { uuidv4 } from "../../../../lib/uuid";
import ExplorerListDir from "./ExplorerListDir.vue";
import ExplorerListFile from "./ExplorerListFile.vue";

export default {
  props: ["tree"],
  components: { ExplorerListDir, ExplorerListFile },
  mixins: [explorer_actions],
  data() {
    return {
      manuallyExpanded: false
    };
  },
  mounted() {
    this.selected.dir = this.tree;
    this.manuallyExpanded = false;
  },
  computed: {
    expanded() {
      return this.manuallyExpanded;
    },

    directories() {
      const dirArr = this.tree.children.filter(element => {
        if (element.type === "dir") {
          return element;
        }
      });

      return dirArr;
    },

    files() {
      const fileArr = this.tree.children.filter(element => {
        if (element.type !== "dir") {
          return element;
        }
      });

      return fileArr;
    }
  }
};
</script>

<style scoped>
.schema > .sub-items {
  padding-left: 18px !important;
}
</style>

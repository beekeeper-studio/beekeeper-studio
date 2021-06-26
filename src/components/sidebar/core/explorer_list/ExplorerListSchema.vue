<template>
  <div class="schema-wrapper">
    <explorer-list-dir
      v-for="(dir, index) in directories"
      :key="index"
      :node="dir"
    ></explorer-list-dir>
    <explorer-list-file
      v-for="(file, index) in files"
      :key="index"
      :file="file"
    ></explorer-list-file>
  </div>
</template>

<script type="text/javascript">
import { uuidv4 } from "../../../../lib/uuid";
import ExplorerListDir from "./ExplorerListDir.vue";
import ExplorerListFile from "./ExplorerListFile.vue";

export default {
  props: ["tree"],
  components: { ExplorerListDir, ExplorerListFile },
  data() {
    return {
      manuallyExpanded: false
    };
  },
  mounted() {
    this.manuallyExpanded = false;
  },
  computed: {
    expanded() {
      return this.manuallyExpanded;
    },

    directories() {
      const dirArr = this.tree.children.filter(element => {
        if (element.type === ".dir") {
          return element;
        }
      });

      return dirArr;
    },

    files() {
      const fileArr = this.tree.children.filter(element => {
        if (element.type !== ".dir") {
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

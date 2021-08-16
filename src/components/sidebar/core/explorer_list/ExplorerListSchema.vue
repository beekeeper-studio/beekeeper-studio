<template>
  <!-- the class is doing nothing -->
  <div class="schema-wrapper">
    <explorer-list-dir
      v-for="dir in directories"
      :key="dir.title"
      :node="dir"
      :depth="0"
    ></explorer-list-dir>

    <explorer-list-file
      v-for="query in queries"
      :key="query.name"
      :query="query"
      :currentNode="currentNode"
      :currentDir="currentDir"
      @select="selectQuery"
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
    this.selected.dir.push(this.tree);
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

    queries() {
      const queriesArr = this.tree.children.filter(element => {
        if (element.type === "query") {
          return element;
        }
      });
      return queriesArr;
    }
  }
};
</script>

<style scoped>
.schema > .sub-items {
  padding-left: 18px !important;
}
</style>

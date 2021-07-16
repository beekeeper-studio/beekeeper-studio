<template>
  <div class="create-node-wrapper">
    <input
      type="text"
      v-model="name"
      class="node-input"
      ref="nodeInput"
      @keydown.enter="rename"
    />
  </div>
</template>

<script>
const folderTree = require("../../../../../plugins/foldertree");

export default {
  props: ["currentNode", "currentDir"],

  mounted() {
    const input = this.$refs.nodeInput;
    const store = this.$store;
    input.focus();
    input.setSelectionRange(0, this.nameLength);
    // any other idea than this more then welcome bcause i could not figure out anything else (not that deep into vuejs apparently :) )
    store.dispatch("setRenameInstance", this.$parent);
  },

  data() {
    return {
      name: this.currentNode.name || ""
    };
  },

  computed: {
    type() {
      switch (this.currentNode.type) {
        case "query":
          return "file";
        case "design":
          return "file";
        case "dir":
          return "dir";
        default:
          return "";
      }
    },

    nameLength() {
      if (this.currentNode.type !== "dir") {
        const nameSplitted = this.currentNode.name.split(".")[0];
        return nameSplitted.length;
      } else {
        return this.currentNode.name.length;
      }
    }
  },

  methods: {
    rename() {
      const node = new folderTree.TreeNode("");
      node.name = this.name;
      folderTree
        .nodeNameValidation(node, this.type)
        .then(() => {
          folderTree
            .renameNode(this.currentNode.path, this.name)
            .then(() => {
              const isExisitng = folderTree.nodeExist(
                this.currentDir,
                this.name
              );
              if (!isExisitng) {
                this.$noty.success("Successfully renamed!");
                this.$root.$emit("refreshExplorer");
                this.$emit("closeRename", this.type);
              } else {
                this.$noty.error("Directory already exists");
                this.$emit("closeRename", this.type);
              }
            })
            .catch(err => {
              this.$noty.error(err.message);
            });
        })
        .catch(type => {
          if (type === "dir") {
            this.$noty.error(`Directories can only contain letters`);
          } else {
            this.$noty.error(
              `Files can only contain letters with the appropriate extensions.`
            );
          }
        });
    },

    close() {
      this.$emit("close");
    }
  }
};
</script>

<style lang="scss" scoped>
.create-node-wrapper {
  display: flex;
  align-items: center;

  .node-input {
    position: relative;
    max-width: 175px;
    border-radius: 0;
  }
}
</style>

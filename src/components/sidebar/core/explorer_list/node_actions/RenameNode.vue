<template>
  <div class="create-node-wrapper">
    <i
      :class="`item-icon material-icons ${renameType.class}`"
      v-if="type !== 'dir'"
    >
      {{ renameType.icon }}
    </i>

    <i class="item-icon schema-icon material-icons " v-if="type === 'dir'">
      folder
    </i>

    <input type="text" v-model="node.name" class="node-input" ref="nodeInput" />
  </div>
</template>

<script>
const folderTree = require("../../../../../plugins/foldertree");

export default {
  props: ["type", "currentNode"],

  computed: {
    renameType() {
      const result = { valid: false, icon: "", class: this.type };
      switch (this.type) {
        case "query":
          result.icon = "code";
          break;
        case "design":
          result.icon = "device_hub";
          break;
      }

      return result;
    },

    node() {
      return this.currentNode || new folderTree.TreeNode("");
    }
  }
};
</script>

<style lang="scss" scoped>
.create-node-wrapper {
  display: flex;
  align-items: center;
  margin-left: 1.2rem;

  .node-input {
    position: relative;
    max-width: 175px;
    border-radius: 0;
  }
}
</style>

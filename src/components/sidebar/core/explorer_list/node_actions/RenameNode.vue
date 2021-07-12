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
  props: ["currentNode"],

  data() {
    return {
      name: this.currentNode.name
    };
  },

  computed: {
    node() {
      return this.currentNode || new folderTree.TreeNode("");
    }
  },

  methods: {
    rename() {},

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

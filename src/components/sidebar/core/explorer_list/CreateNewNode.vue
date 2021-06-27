<template>
  <div>
    <input
      type="text"
      v-model="node.name"
      :placeholder="placeholder"
      @keydown.enter="createNode"
    />
  </div>
</template>

<script>
const folderTree = require("../../../../plugins/foldertree");
const extensionRegEx = /^[a-zA-Z]+.(query|design)$/;
export default {
  props: ["placeholder", "type"],
  data() {
    return {
      node: new folderTree.TreeNode()
    };
  },

  methods: {
    createNode() {
      if (extensionRegEx.test(this.node.name)) {
        console.log("itstrue");
      }
      const type = this.type || this.node.name.split(".")[1];
      console.log(type);
      this.node.type = this.type;
      console.log(this.node);
    }
  }
};
</script>

<style lang="scss" scoped></style>

<template>
  <div class="rename-node-wrapper" v-hotkey="keymap">
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
export default {
  props: ["currentNode", "type", "currentParentNode"],

  mounted() {
    const input = this.$refs.nodeInput;
    input.focus();
    input.setSelectionRange(0, this.nameLength);
    this.$store.dispatch("setStateInstance", {
      instance: this.$parent,
      type: "rename"
    });
  },

  data() {
    return {
      name: this.currentNode?.node?.title || this.currentNode.title
    };
  },

  computed: {
    keymap() {
      return {
        esc: this.close
      };
    },

    nameLength() {
      if (this.type === "file" || this.type === "dir") {
        return this.currentNode.node.title.length;
      } else {
        return this.currentNode.title.length;
      }
    },

    errorType() {
      if (this.type === "file") {
        return `${this.type[0].toUpperCase()}ile`;
      } else {
        return `Directory`;
      }
    }
  },

  methods: {
    close() {
      this.$emit("close", this.currentNode);
    },

    rename() {
      if (this.type === "file" || this.type === "dir") {
        this.renameFileOrDirectory();
      } else if (this.type === "workspace") {
        this.renameWorkspace();
      }
    },

    async renameFileOrDirectory() {
      const isExisting = this.$isFileOrDirExisting(
        this.name,
        this.currentParentNode,
        this.type
      );

      this.currentNode.node.title = this.name;

      if (this.type === "file") {
        await this.$store.dispatch("saveFavorite", this.currentNode.node);
      } else if (this.type === "dir") {
        await this.$store.dispatch("createDirectory", this.currentNode.node);
      }
      this.close();
    },

    async renameWorkspace() {
      const isExisting = this.$isWorkspaceExisting(this.name);

      if (isExisting) {
        this.$noty.error(`${this.errorType} already exists`);
        return;
      }

      this.currentNode.title = this.name;
      await this.$store.dispatch("createWorkspace", this.currentNode);
      this.close();
    }
  }
};
</script>

<style lang="scss" scoped>
.rename-node-wrapper {
  display: flex;
  align-items: center;

  .node-input {
    position: relative;
    max-width: 175px;
    border-radius: 0;
  }
}
</style>

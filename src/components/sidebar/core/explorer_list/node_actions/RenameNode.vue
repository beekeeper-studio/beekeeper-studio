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
      name: this.currentNode.node.title || ""
    };
  },

  computed: {
    keymap() {
      return {
        esc: this.close
      };
    },

    nameLength() {
      return this.currentNode.node.title.length;
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

    async rename() {
      const isExisting = this.$isExisting(
        this.name,
        this.currentParentNode,
        this.type
      );

      if (isExisting) {
        this.$noty.error(`${this.errorType} already exists`);
        return;
      }

      this.currentNode.node.title = this.name;

      if (this.type === "file") {
        await this.$store.dispatch("saveFavorite", this.currentNode.node);
      } else if (this.type === "dir") {
        await this.$store.dispatch("createDirectory", this.currentNode.node);
      }
      this.close(this.currentNode);
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

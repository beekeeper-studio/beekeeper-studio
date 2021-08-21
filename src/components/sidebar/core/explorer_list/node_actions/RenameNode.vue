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
  props: ["currentNode", "type", "currentParentNode", "validation"],

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
      } else if (this.type === "dir") {
        return `Directory`;
      } else if (this.type === "workspace") {
        return `Workspace`;
      } else {
        return this.type;
      }
    }
  },

  methods: {
    close() {
      this.$emit("close", this.currentNode);
    },

    rename() {
      const isExisting = this.checkExistenz();

      if (isExisting) {
        this.$noty.error(`${this.errorType} already exists`);
        return;
      }

      const isValidName = this.validation.test(this.name);

      if (!isValidName) {
        this.$noty.error(`Name not valid`);
        return;
      }

      this.$emit("rename", this.name);
      this.close();

      this.$noty.success(`Successfully renamed to ${this.name}`);
    },

    checkExistenz() {
      let isExisting = this.$isExisting(
        this.type,
        this.name,
        this.currentParentNode
      );
      return isExisting;
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

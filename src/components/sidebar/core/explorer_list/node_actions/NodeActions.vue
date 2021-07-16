<template>
  <div class="create-node-wrapper">
    <!-- create files -->

    <i
      class="schema-icon item-icon material-icons"
      v-if="!fileCreation && type !== 'dir'"
    >
      description
    </i>

    <i
      :class="`item-icon material-icons ${extensionDetected.class}`"
      v-if="fileCreation"
    >
      {{ extensionDetected.icon }}
    </i>

    <i class="item-icon schema-icon material-icons " v-if="type === 'dir'">
      folder
    </i>

    <input
      type="text"
      v-model="node.name"
      :placeholder="placeholder"
      @keydown.enter="nameValidation"
      class="node-input"
      ref="nodeInput"
    />
  </div>
</template>

<script>
const folderTree = require("../../../../../plugins/foldertree");

export default {
  props: ["placeholder", "type", "currentDir"],
  data() {
    return {
      node: new folderTree.TreeNode(""),
      extensionValidation: this.$store.getters.explorerValidation,
      extension: this.$store.getters.includedExtension
    };
  },

  computed: {
    extensionDetected() {
      const result = { valid: false, icon: "", class: "" };
      const typedExtension = this.node.name.split(".")[1] || "";
      this.extension.forEach(element => {
        if (element === typedExtension && this.reg.file.test(this.node.name)) {
          result.valid = true;
          result.class = typedExtension;

          switch (typedExtension) {
            case "query":
              result.icon = "code";
              break;
            case "design":
              result.icon = "device_hub";
              break;
          }
        }
      });

      return result;
    },

    fileCreation() {
      return this.extensionDetected.valid && this.type === "file";
    },

    reg() {
      return {
        file: new RegExp(this.extensionValidation.file),
        dir: new RegExp(this.extensionValidation.dir)
      };
    }
  },

  methods: {
    nameValidation() {
      const s = folderTree
        .nodeNameValidation(this.node, this.type)
        .then(() => {
          this.node.path = `${this.currentDir.path}\\${this.node.name}`;
          console.log(this.node);
          this.createNode();
        })
        .catch(type => {
          this.error(type);
        });
    },

    createNode() {
      const alreadyExist = folderTree.nodeExist(
        this.currentDir,
        this.node.name
      );

      if (!alreadyExist) {
        folderTree.addNode(this.currentDir, this.node, this.type).then(() => {
          this.node = new folderTree.TreeNode("");
          this.$emit("close");
        });
      } else {
        this.error("duplicate");
      }
    },

    error(type) {
      switch (type) {
        case "dir":
          this.$noty.error("Directories can only contain letters.");
          break;
        case "file":
          this.$noty.error(
            "Filename cannot have white spaces or start with special characters or numbers. The Extension accepted are .query and .design"
          );
          break;
        case "duplicate":
          this.$noty.error("File/Directorie already exists.");
          break;
      }
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

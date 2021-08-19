<template>
  <div class="create-node-wrapper" v-hotkey="keymap">
    <i :class="`item-icon  ${inputValidation.class} material-icons `">
      {{ inputValidation.icon }}
    </i>

    <input
      type="text"
      :placeholder="placeholder"
      @keydown.enter="create"
      v-model="title"
      class="node-input"
      ref="nodeInput"
      autofocus
    />
  </div>
</template>

<script>
export default {
  props: ["placeholder", "type", "currentDir"],
  data() {
    return {
      extensionValidation: this.$store.getters.explorerValidation,
      extension: this.$store.getters.includedExtension,
      title: ""
    };
  },
  mounted() {
    this.closeOpenComponents();
  },

  computed: {
    inputValidation() {
      const result = { icon: "description", class: "schema-icon" };
      const file = new RegExp(this.extensionValidation.file);
      const dir = new RegExp(this.extensionValidation.dir);
      if (this.type === "file" && file.test(this.title)) {
        result.icon = "code";
        result.class = "query";
        return result;
        //create file
      } else if (this.type === "dir" && dir.test(this.title)) {
        result.icon = "folder";
        return result;
        // create dir
      } else if (this.type === "workspace" && dir.test(this.title)) {
        result.icon = "widgets";
        result.class = "item-icon";
        return result;
      } else {
        return this.default;
      }
    },

    keymap() {
      return {
        esc: this.close
      };
    },

    default() {
      if (this.type === "file") {
        return { icon: "description", class: "schema-icon", isValid: false };
      } else if (this.type === "dir") {
        return { icon: "folder", class: "schema-icon ", isValid: false };
      } else if (this.type === "workspace") {
        return { icon: "widgets", class: "schema-icon ", isValid: false };
      } else {
        return { icon: "description", class: "schema-icon", isValid: false };
      }
    },

    onlyTitle() {
      if (this.type === "file") {
        return this.title.split(".")[0];
      } else {
        return this.title;
      }
    }
  },

  methods: {
    // TODO fix this mess
    async create() {
      if (
        !this.inputValidation.hasOwnProperty("isValid") &&
        this.type !== "workspace"
      ) {
        if (
          !this.$isFileOrDirExisting(this.onlyTitle, this.currentDir, this.type)
        ) {
          if (this.type === "file") {
            this.$emit("createFile", this.onlyTitle);
            this.close();
          } else if (this.type == "dir") {
            this.$emit("createDirectory", this.onlyTitle);
            this.close();
          }
          return;
        } else {
          this.error("duplicate");
          return;
        }
      } else if (
        !this.inputValidation.hasOwnProperty("isValid") &&
        this.type === "workspace"
      ) {
        if (!this.$isWorkspaceExisting(this.onlyTitle)) {
          this.$emit("createWorkspace", this.onlyTitle);
          this.close();
        } else {
          this.error("duplicate");
          return;
        }
      }

      this.error(this.type);
    },

    close() {
      this.title = "";
      this.$emit("close");
    },

    error(type) {
      switch (type) {
        case "dir":
          this.$noty.error(
            "Directories can only contain letters, underscores(_) or dashes(-)"
          );
          break;
        case "file":
          this.$noty.error("Filename cannot have white spaces or numbers.");
          break;
        case "duplicate":
          this.$noty.error("File/Directory already exists.");
          break;
      }
    },

    closeOpenComponents() {
      this.$store.dispatch("setStateInstance", {
        instance: this.$parent,
        type: "creation"
      });
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

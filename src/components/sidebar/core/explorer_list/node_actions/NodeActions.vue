<template>
  <div class="create-node-wrapper" v-hotkey="keymap">
    <!-- create files -->

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
    />
  </div>
</template>

<script>
import { FavoriteQuery } from "@/common/appdb/models/favorite_query";
import { Directory } from "@/common/appdb/models/directory";

export default {
  props: ["placeholder", "type", "currentDir"],
  data() {
    return {
      extensionValidation: this.$store.getters.explorerValidation,
      extension: this.$store.getters.includedExtension,
      title: "",
      rootBindings: []
    };
  },

  mounted() {
    this.$store.dispatch("setStateInstance", {
      instance: this.$parent,
      type: "creation"
    });
  },

  computed: {
    inputValidation() {
      const result = { icon: "description", class: "schema-icon " };
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
      } else {
        return { icon: "folder", class: "schema-icon ", isValid: false };
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
    async create() {
      if (!this.inputValidation.hasOwnProperty("isValid")) {
        if (!this.$isExisting(this.onlyTitle, this.currentDir, this.type)) {
          if (this.type === "file") {
            this.createQuery();
          } else if (this.type == "dir") {
            this.createDirectory();
          }
          return;
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

    async createQuery(title) {
      const query = new FavoriteQuery();
      query.title = title || this.onlyTitle;
      query.directory_id = this.currentDir.node.id;
      query.text = "";
      await this.$store.dispatch("saveFavorite", query);
      this.closeAndRefresh();
    },

    async createDirectory(title) {
      const currentworkspace = this.$store.getters.currentWorkspace.node;
      const dir = new Directory();
      dir.title = title || this.title;
      dir.workspace_id = currentworkspace.id;
      dir.parent_id = this.currentDir.node.id;
      dir.deepth = this.currentDir.node.deepth + 1;
      dir.isWorkspace = 0;
      await this.$store.dispatch("createDirectory", dir);
      this.closeAndRefresh();
    },

    closeAndRefresh() {
      setTimeout(() => {
        this.$root.$emit("refreshExplorer");
        this.close();
      }, 1);
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

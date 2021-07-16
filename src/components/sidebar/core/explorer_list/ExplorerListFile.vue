<template>
  <div class="list-item extra-padding">
    <a class="list-item-btn" role="button">
      <span class="item-wrapper flex flex-middle expand">
        <i :class="`item-icon ${fileType.class} material-icons`">
          {{ fileType.icon }}
        </i>
        <RenameNode
          :currentNode="currentNode"
          :currentDir="currentDir"
          @closeRename="close"
          v-if="renameState.trigger"
        ></RenameNode>
        <span class="folder-name-unselected truncate" v-else>
          {{ file.name }}
        </span>
      </span>
      <x-contextmenu>
        <x-menu>
          <x-menuitem @click.prevent="select">
            <x-label>Rename</x-label>
          </x-menuitem>
          <hr />
          <x-menuitem @click.prevent="remove">
            <x-label class="text-danger">Remove</x-label>
          </x-menuitem>
        </x-menu>
      </x-contextmenu>
    </a>
  </div>
</template>

<script>
import RenameNode from "./node_actions/RenameNode.vue";
import { mapState } from "vuex";

export default {
  name: "explorer-list-file",
  props: ["file", "currentNode", "currentDir"],
  data() {
    return {
      renameState: {
        trigger: false
      }
    };
  },
  components: { RenameNode },
  computed: {
    ...mapState(["favorites"]),
    fileType() {
      const result = { class: this.file.type, icon: "" };
      switch (this.file.type) {
        case "query":
          result.icon = "code";
          return result;
        case "design":
          result.icon = "device_hub";
          return result;
        default:
          return result;
      }
    }
  },

  methods: {
    async select() {
      const query = await this.$store.state.connection.database;
      this.$emit("selectFile", this.file);
      this.renameState.trigger = true;
    },

    close() {
      this.renameState.trigger = false;
    }
  }
};
</script>

<style lang="scss" scoped>
.extra-padding {
  padding: 0 1.1rem !important;
}
</style>

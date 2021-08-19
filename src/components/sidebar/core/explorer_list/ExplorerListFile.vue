<template>
  <div class="list-item extra-padding" @contextmenu="isNotRootLevel">
    <a
      class="list-item-btn"
      role="button"
      @click.exact="click(query)"
      @click.shift.exact="renameState"
      @click.ctrl.exact="remove(query)"
    >
      <span class="item-wrapper flex flex-middle expand">
        <i :class="`item-icon query material-icons`">
          code
        </i>
        <RenameNode
          :currentNode="currentNode"
          :currentParentNode="currentParentNode"
          :type="'file'"
          @close="close"
          v-if="state.renameTrigger"
        ></RenameNode>
        <span class="folder-name-unselected truncate" v-else>
          {{ query.node.title }}
        </span>
      </span>
      <x-contextmenu v-show="showContextMenu">
        <x-menu>
          <x-menuitem @click.stop="[renameState, toggleOffContextMenu()]">
            <x-label>Rename</x-label>
          </x-menuitem>
          <hr />
          <x-menuitem @click.stop="[remove(query), toggleOffContextMenu()]">
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
import toggle_off_system from "@/mixins/explorer/toggle_off_system";

export default {
  name: "explorer-list-file",
  props: ["query", "currentNode", "currentParentNode"],
  mixins: [toggle_off_system],
  data() {
    return {
      state: {
        renameTrigger: false
      }
    };
  },
  components: { RenameNode },
  computed: {
    ...mapState(["favorites"])
  },

  methods: {
    async renameState() {
      this.$emit("select", this.query);
      this.state.renameTrigger = true;
    },

    click(query) {
      this.$root.$emit("favoriteClick", query.node);
      this.$store.dispatch("setSelectNode", query);
    },

    close() {
      this.state.renameTrigger = false;
    },

    async remove(query) {
      await this.$store.dispatch("removeFavorite", query.node);

      this.$root.$emit("refreshExplorer");
    },

    isNotRootLevel() {
      this.$root.$emit("isNotRootLevel");
      this.showContextMenu = true;
    }
  }
};
</script>

<style lang="scss" scoped>
.extra-padding {
  padding: 0 1.1rem !important;
}
</style>

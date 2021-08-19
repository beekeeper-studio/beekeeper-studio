<template>
  <div class="list-item" @contextmenu="isNotRootLevel">
    <a
      class="list-item-btn"
      @click.exact="select(workspace)"
      @click.shift.exact="createState('rename')"
      @click.ctrl.exact="remove(workspace)"
    >
      <i class="item-icon material-icons">widgets</i>

      <div class="list-title flex-col">
        <RenameNode
          :currentNode="workspace"
          :type="'workspace'"
          @close="close"
          v-if="state.renameTrigger"
        ></RenameNode>
        <span class="item-text expand truncate" v-else>
          {{ nicelySized(workspace.title) }}</span
        >

        <span class="subtitle">
          <span>{{ workspace.createdAt }} </span>
        </span>
      </div>
      <x-contextmenu v-show="showContextMenu">
        <x-menu style="--target-align: right; --v-target-align: top;">
          <x-menuitem
            @click.stop="[createState('rename'), toggleOffContextMenu()]"
          >
            <x-label>Rename</x-label>
            <x-shortcut value="Shift+LB"></x-shortcut>
          </x-menuitem>
          <hr />
          <x-menuitem @click.stop="[remove(workspace), toggleOffContextMenu()]">
            <x-label class="text-danger">Remove</x-label>
            <x-shortcut value="Control+LB"></x-shortcut>
          </x-menuitem>
        </x-menu>
      </x-contextmenu>
    </a>
  </div>
</template>

<script>
import node_actions_integration from "@/mixins/explorer/node_actions_integration";
import toggle_off_system from "@/mixins/explorer/toggle_off_system";
import RenameNode from "./node_actions/RenameNode.vue";
export default {
  props: ["workspace"],
  mixins: [node_actions_integration, toggle_off_system],
  components: { RenameNode },
  data() {
    return {};
  },

  computed: {},

  methods: {
    nicelySized(text) {
      if (text.length >= 128) {
        return `${text.substring(0, 128)}...`;
      } else {
        return text;
      }
    },

    async remove(workspace) {
      await this.$store.dispatch("removeWorkspace", workspace);
      setTimeout(() => {
        this.$root.$emit("refreshWorkspace");
      }, 1);
    },

    select(workspace) {
      this.$root.$emit("selectWorkspace", workspace);
    },

    createState(actionType) {
      this.nodeData.actionType = actionType;
      this.state.renameTrigger = true;
    },

    isNotRootLevel() {
      this.$emit("isNotRootLevel");
      this.showContextMenu = true;
    }
  }
};
</script>

<style lang="scss" scoped>
.center-empty {
  display: grid;
  justify-content: center;
  align-items: center;
}

.align {
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}

.left-margin {
  margin-left: 5px;
}

.shoter-widht {
  width: 300px !important;
}
</style>

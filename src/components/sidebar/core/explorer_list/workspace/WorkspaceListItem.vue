<template>
  <div class="list-item" @contextmenu="isNotRootLevel">
    <a
      class="list-item-btn"
      @click.exact="select(workspace)"
      @click.alt.exact="createState('rename')"
      @click.ctrl.alt.exact="remove(null, null)"
    >
      <i class="item-icon material-icons">widgets</i>

      <div class="list-title flex-col">
        <RenameNode
          :currentNode="workspace"
          :type="'workspace'"
          :validation="$store.getters.allValidation.dir"
          @close="defaultRenameClose"
          @rename="rename"
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
            <x-shortcut value="Alt+LMB"></x-shortcut>
          </x-menuitem>
          <hr />
          <x-menuitem
            @click.stop="[remove(null, null), toggleOffContextMenu()]"
          >
            <x-label class="text-danger">Remove</x-label>
            <x-shortcut value="Control+Alt+LMB"></x-shortcut>
          </x-menuitem>
        </x-menu>
      </x-contextmenu>
    </a>

    <ActionWarning
      :type="'workspace'"
      v-if="showWarning"
      @close="toggleWarning"
      @remove="remove(workspace, $event)"
    ></ActionWarning>
  </div>
</template>

<script>
import node_actions_integration from "@/mixins/explorer/node_actions_integration";
import toggle_off_system from "@/mixins/explorer/toggle_off_system";
import RenameNode from "../node_actions/RenameNode.vue";
import ActionWarning from "../node_actions/ActionWarning.vue";
import rename_integration from "@/mixins/explorer/rename_integration";
import warning_integration from "@/mixins/explorer/warning_integration";
export default {
  props: ["workspace"],
  mixins: [toggle_off_system, rename_integration, warning_integration],
  components: { RenameNode, ActionWarning },
  data() {
    return {};
  },

  methods: {
    nicelySized(text) {
      if (text.length >= 128) {
        return `${text.substring(0, 128)}...`;
      } else {
        return text;
      }
    },

    async remove(workspace, options) {
      if (workspace !== null) {
        await this.$store.dispatch("removeWorkspace", workspace);
        setTimeout(() => {
          this.$root.$emit("refreshWorkspace", false);
          this.$noty.success("Deleted Workspace");
        }, 1);
      } else {
        this.toggleWarning();
      }
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
    },

    async rename(name) {
      this.workspace.title = name;
      await this.$store.dispatch("createWorkspace", this.workspace);
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

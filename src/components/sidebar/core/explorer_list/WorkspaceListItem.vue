<template>
  <div class="list-item" @contextmenu="$emit('isNotRootLevel')">
    <a class="list-item-btn" @click.self="select(workspace)">
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
      <x-contextmenu>
        <x-menu style="--target-align: right; --v-target-align: top;">
          <x-menuitem @click="createState('rename')">
            <x-label>Rename</x-label>
          </x-menuitem>
          <hr />
          <x-menuitem @click="remove(workspace)">
            <x-label class="text-danger">Remove</x-label>
          </x-menuitem>
        </x-menu>
      </x-contextmenu>
    </a>
  </div>
</template>

<script>
import node_actions_integration from "@/mixins/explorer/node_actions_integration";
import RenameNode from "./node_actions/RenameNode.vue";
export default {
  props: ["workspace"],
  mixins: [node_actions_integration],
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

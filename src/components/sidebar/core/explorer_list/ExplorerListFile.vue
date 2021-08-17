<template>
  <div
    class="list-item extra-padding"
    @contextmenu="$root.$emit('isNotRootLevel')"
  >
    <a class="list-item-btn" role="button" @click="click(query)">
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
      <x-contextmenu>
        <x-menu>
          <x-menuitem @click.prevent="renameState">
            <x-label>Rename</x-label>
          </x-menuitem>
          <hr />
          <x-menuitem @click.prevent="remove(query)">
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
  props: ["query", "currentNode", "currentParentNode"],
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
    }
  }
};
</script>

<style lang="scss" scoped>
.extra-padding {
  padding: 0 1.1rem !important;
}
</style>

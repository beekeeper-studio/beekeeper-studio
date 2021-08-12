<template>
  <div class="list-item extra-padding">
    <a class="list-item-btn" role="button" @click="click(query.node)">
      <span class="item-wrapper flex flex-middle expand">
        <i :class="`item-icon query material-icons`">
          code
        </i>
        <RenameNode
          :currentNode="currentNode"
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
          <x-menuitem @click.prevent="select">
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
  props: ["query", "currentNode"],
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
    async select() {
      this.$emit("select", this.query);
      this.state.renameTrigger = true;
    },

    click(query) {
      this.$root.$emit("favoriteClick", query);
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

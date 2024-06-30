<template>
  <div
    class="schema-wrapper"
    @contextmenu="$emit('contextmenu', $event)"
  >
    <div
      class="folder-group schema"
      v-if="!skipDisplay"
    >
      <a
        class="folder-btn"
        :class="{'open': expanded}"
        role="button"
        @click.prevent="manuallyExpanded = !manuallyExpanded"
      >
        <span class="btn-fab open-close">
          <i class="dropdown-icon material-icons">keyboard_arrow_right</i>
        </span>
        <i
          title="Schema"
          class="schema-icon item-icon material-icons"
        >folder</i>
        <span
          class="table-name truncate expand"
          :title="title"
        >{{ title }}</span>
      </a>
      <div v-if="expanded">
        <template v-if="hasSlot">
          <slot />
        </template>
        <template v-else>
          <template v-if="$slots.placeholder">
            <slot name="placeholder" />
          </template>
          <div
            v-else
            class="list-item empty"
          >
            {{ placeholder || "No items" }}
          </div>
        </template>
      </div>
    </div>
    <div v-else>
      <slot />
    </div>
  </div>
</template>

<script type="text/javascript">
	export default {
    props: ["title", "forceExpand", "forceCollapse", "expandedInitially", "skipDisplay", "placeholder", "connections"],
    data() {
      return {
        manuallyExpanded: false,
      }
    },
    mounted() {
      this.manuallyExpanded = this.expandedInitially
    },
    computed: {
      hasSlot() {
        return !!this.$slots.default
      },
      expanded() {
        return this.manuallyExpanded
      }
    },
    watch: {
      forceExpand() {
        this.manuallyExpanded = this.forceExpand
      },
      forceCollapse() {
        if (this.forceCollapse) {
          this.manuallyExpanded = false
        }
      },
    },
	}
</script>

<style lang="scss" scoped>
  @import '../../assets/styles/app/_variables';

  .schema > .sub-items {
    padding-left: 18px!important;
  }
</style>

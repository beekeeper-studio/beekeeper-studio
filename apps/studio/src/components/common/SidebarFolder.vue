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
        @click.prevent="toggleExpanded"
        @dragover.prevent="handleDragOver"
        @dragleave="handleDragLeave"
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
      <slot name="folder-drop-zone" />
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
        dragExpandTimer: null,
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
    methods: {
      toggleExpanded() {
        this.manuallyExpanded = !this.manuallyExpanded
        this.$emit('toggle', this.manuallyExpanded)
      },
      handleDragOver() {
        if (this.expanded || this.dragExpandTimer) return
        this.dragExpandTimer = setTimeout(() => {
          this.manuallyExpanded = true
          this.dragExpandTimer = null
        }, 600)
      },
      handleDragLeave() {
        if (this.dragExpandTimer) {
          clearTimeout(this.dragExpandTimer)
          this.dragExpandTimer = null
        }
      },
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

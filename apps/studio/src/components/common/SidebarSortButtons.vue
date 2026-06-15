<template>
  <div class="sort-buttons">
    <bk-button
      v-if="noOrder !== sortBy"
      class="actions-btn btn btn-link btn-sm"
      v-tooltip="sortOrderTooltip"
      @click.prevent="toggleSortOrder"
    >
      <i
        v-if="sortOrder == 'desc'"
        class="material-icons"
      >expand_more</i>
      <i
        v-else
        class="material-icons"
      >expand_less</i>
    </bk-button>
    <bk-button
      class="actions-btn btn btn-link btn-sm"
      v-tooltip="'Reorder items'"
    >
      <i class="material-icons-outlined">sort</i>
      <bk-menu style="--target-align:right;">
        <bk-menuitem
          v-for="key in Object.keys(sortOptions)"
          :key="key"
          @click.prevent="sortBy = key"
        >
          <bk-label>{{ sortOptions[key] }}</bk-label>
        </bk-menuitem>
      </bk-menu>
    </bk-button>
  </div>
</template>

<style lang="scss" scoped>
  .sort-buttons {
    display: flex;
    .btn.actions-btn {
      min-width: 0;
      padding: 0;
      &:hover {
        background-color: inherit;
      }

    }
  }
</style>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  props: ['value', 'sortOptions', 'noOrder'],
  data() {
    const valid = ['asc', 'desc']
    return {
      sortBy: this.value.field,
      sortOrder: valid.includes(this.value.order) ? this.value.order : 'asc',
    }
  },
  computed: {
    sortOrderTooltip() {
      return this.sortOrder === 'desc' ? 'Descending' : 'Ascending'
    }
  },
  watch: {
    sortOrder() {
      this.emit()
    },
    sortBy() {
      this.emit()
    }
  },
  methods: {
    emit() {
      this.$emit('input', { field: this.sortBy, order: this.sortOrder })
    },
    toggleSortOrder() {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc'
    }
  }
})
</script>

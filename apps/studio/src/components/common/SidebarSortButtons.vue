<template>
  <div class="sort-buttons">
    <x-button
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
    </x-button>
    <x-button
      class="actions-btn btn btn-link btn-sm"
      v-tooltip="`Sorted by ${sortOptions[sortBy]} (${sortOrderTooltip})`"
    >
      <i class="material-icons-outlined">sort</i>
      <x-menu style="--target-align:right;">
        <x-menuitem
          v-for="key in Object.keys(sortOptions)"
          :key="key"
          :toggled="key === sortBy"
          togglable
          @click.prevent="sortBy = key"
        >
          <x-label>{{ sortOptions[key] }}</x-label>
        </x-menuitem>
      </x-menu>
    </x-button>
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

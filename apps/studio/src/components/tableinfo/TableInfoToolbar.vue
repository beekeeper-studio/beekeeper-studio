<template>
  <div class="table-info-toolbar">
    <div class="toolbar-title">
      <table-info-filter
        :placeholder="filterPlaceholder"
        :suffix="searchSuffix"
        @search="$emit('search', $event)"
      />
    </div>
    <slot />
    <div class="toolbar-actions">
      <a
        class="toolbar-btn refresh-btn"
        v-tooltip="$bksConfigUI.getKeybindingLabel('general.refresh')"
        @click.prevent="$emit('refresh')"
      ><i class="material-icons">refresh</i></a>
      <x-button
        class="toolbar-btn copy-btn"
        title="Copy structure"
      >
        <i class="material-icons">content_copy</i>
        <i class="material-icons dropdown-icon">arrow_drop_down</i>
        <x-menu style="--target-align: right;">
          <x-menuitem
            v-for="option in formats"
            :key="option.format"
            @click.prevent="$emit('copy', option.format)"
          >
            <x-label>Copy as {{ option.name }}</x-label>
          </x-menuitem>
        </x-menu>
      </x-button>
      <a
        v-if="showAdd"
        class="toolbar-btn add-btn"
        v-tooltip="$bksConfigUI.getKeybindingLabel('general.addRow')"
        @click.prevent="$emit('add')"
      ><i class="material-icons">add</i><span>{{ addLabel }}</span></a>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import TableInfoFilter from './TableInfoFilter.vue'
import { structureCopyFormats } from '@/lib/tableinfo/structure'

export default Vue.extend({
  components: { TableInfoFilter },
  props: {
    filterPlaceholder: {
      type: String,
      default: 'Filter',
    },
    /** Rendered after the search input, e.g. a match count like '11/14' */
    searchSuffix: {
      type: String,
      default: '',
    },
    /** The add button is per tab: not every grid supports adding rows. */
    showAdd: {
      type: Boolean,
      default: false,
    },
    /** Label on the add button, e.g. 'Column' */
    addLabel: {
      type: String,
      default: 'Add',
    },
  },
  data() {
    return {
    }
  },
  computed: {
    formats() {
      return structureCopyFormats
    },
  },
})
</script>

<template>
  <div class="table-info-toolbar">
    <table-info-filter
      :tabulator="tabulator"
      :placeholder="filterPlaceholder"
      @matches="$emit('matches', $event)"
    />
    <x-button
      class="toolbar-btn copy-btn"
      title="Copy structure"
    >
      <i class="material-icons">content_copy</i>
      <span>Copy</span>
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
      class="toolbar-btn refresh-btn"
      v-tooltip="$bksConfigUI.getKeybindingLabel('general.refresh')"
      @click.prevent="$emit('refresh')"
    ><i class="material-icons">refresh</i></a>
    <template v-if="showAdd">
      <div class="toolbar-divider" />
      <a
        class="toolbar-btn add-btn"
        v-tooltip="$bksConfigUI.getKeybindingLabel('general.addRow')"
        @click.prevent="$emit('add')"
      ><i class="material-icons">add</i><span>{{ addLabel }}</span></a>
    </template>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { Tabulator } from 'tabulator-tables'
import TableInfoFilter from './TableInfoFilter.vue'
import { structureCopyFormats } from '@/lib/tableinfo/structure'

export default Vue.extend({
  components: { TableInfoFilter },
  props: {
    /** The live tabulator instance behind the tab's grid, only handed on to the filter */
    tabulator: {
      type: Object as () => Tabulator,
      default: null,
    },
    filterPlaceholder: {
      type: String,
      default: 'Filter',
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
  computed: {
    formats() {
      return structureCopyFormats
    },
  },
})
</script>

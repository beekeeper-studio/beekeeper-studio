<template>
  <x-button
    class="copy-structure-btn btn btn-link btn-fab"
    :title="`Copy ${label}`"
  >
    <i class="material-icons">content_copy</i>
    <x-menu style="--target-align: right;">
      <x-menuitem
        v-for="option in formats"
        :key="option.format"
        @click.prevent="copy(option.format)"
      >
        <x-label>{{ option.label }}</x-label>
      </x-menuitem>
    </x-menu>
  </x-button>
</template>

<script lang="ts">
import Vue from 'vue'
import { ColumnDefinition } from 'tabulator-tables'
import {
  formatStructure,
  structureColumns,
  structureCopyFormats,
  StructureCopyFormat,
} from '@/lib/tableinfo/copyStructure'

export default Vue.extend({
  props: {
    /** Tabulator column definitions, as rendered by the parent tab */
    columns: {
      type: Array as () => ColumnDefinition[],
      required: true,
    },
    /** The rows backing the tabulator instance */
    rows: {
      type: Array as () => Record<string, any>[],
      required: true,
    },
    /** What's being copied, eg 'Columns'. Used in the tooltip. */
    label: {
      type: String,
      required: true,
    },
  },
  computed: {
    formats() {
      return structureCopyFormats
    },
  },
  methods: {
    copy(format: StructureCopyFormat) {
      const columns = structureColumns(this.columns)
      const text = formatStructure(this.rows, columns, format)
      this.$native.clipboard.writeText(text)
    },
  },
})
</script>

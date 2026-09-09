import {
  formatStructure,
  tabulatorStructureColumns,
  StructureCopyFormat,
} from "@/lib/tableinfo/structure";

/**
 * Handles the table-info toolbar's `copy` event. Expects the component to
 * keep its grid in `this.tabulator`.
 */
export const StructureCopyMixin = {
  methods: {
    /** Copies the grid as filtered and sorted on screen. */
    copyStructure(format: StructureCopyFormat) {
      if (!this.tabulator) return;
      const columns = tabulatorStructureColumns(this.tabulator);
      this.$native.clipboard.writeText(
        formatStructure(this.tabulator.getData("active"), columns, format)
      );
    },
  },
};

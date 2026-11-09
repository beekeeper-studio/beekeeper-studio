import _ from "lodash";
import { Tabulator } from "tabulator-tables";
import {
  structureFilter,
  tabulatorStructureColumns,
} from "@/lib/tableinfo/structure";

const DEBOUNCE_MS = 250;

/**
 * Handles the table-info toolbar's `search` event and feeds its
 * `search-suffix` back with the match count. Expects the component to keep
 * its grid in `this.tabulator`; the grid may be null until mounted and
 * swapped for a new instance whenever the component rebuilds it.
 *
 * Wire it up as:
 *   :search-suffix="structureFilterSuffix"
 *   @search="setStructureFilterQuery"
 */
export const StructureFilterMixin = {
  data() {
    return {
      structureFilterQuery: "",
      structureFilterApplied: false,
      structureFilterMatches: null as { matched: number; total: number },
      // Debounced per instance, not on the prototype: every structure tab
      // uses this mixin and they must not share a timer.
      debouncedApplyStructureFilter: null as _.DebouncedFunc<() => void>,
    };
  },
  computed: {
    /** The toolbar's search suffix, e.g. '11/14'. Empty while unfiltered. */
    structureFilterSuffix(): string {
      if (!this.structureFilterMatches) return "";
      return `${this.structureFilterMatches.matched}/${this.structureFilterMatches.total}`;
    },
  },
  watch: {
    structureFilterQuery() {
      this.debouncedApplyStructureFilter();
    },
    tabulator: {
      immediate: true,
      handler(tabulator: Tabulator, old: Tabulator) {
        if (old) {
          old.off("tableBuilt", this.applyStructureFilter);
          old.off("dataFiltered", this.onStructureDataFiltered);
        }
        // A rebuilt table starts out unfiltered. It also isn't filterable
        // until it has finished building, so try now and again once it
        // reports built -- whichever happens first wins.
        this.structureFilterApplied = false;
        if (tabulator) {
          tabulator.on("tableBuilt", this.applyStructureFilter);
          tabulator.on("dataFiltered", this.onStructureDataFiltered);
        }
        this.applyStructureFilter();
      },
    },
  },
  created() {
    this.debouncedApplyStructureFilter = _.debounce(
      this.applyStructureFilter,
      DEBOUNCE_MS
    );
  },
  beforeDestroy() {
    this.debouncedApplyStructureFilter.cancel();
  },
  methods: {
    /** Handles the toolbar's `search` event. */
    setStructureFilterQuery(query: string) {
      this.structureFilterQuery = query;
    },
    applyStructureFilter() {
      if (!this.tabulator) return;
      const term = this.structureFilterQuery.trim().toLowerCase();

      if (!term) {
        if (this.structureFilterApplied) {
          this.structureFilterApplied = false;
          this.tabulator.clearFilter(false);
        }
        this.structureFilterMatches = null;
        return;
      }

      const fields = tabulatorStructureColumns(this.tabulator).map((c) => c.field);
      // A table that hasn't been built yet reports no columns, and filtering
      // on no columns would hide every row. Leave it to the tableBuilt pass.
      if (!fields.length) return;

      this.tabulator.setFilter(structureFilter, { term, fields });
      this.structureFilterApplied = true;
      this.updateStructureFilterMatches();
    },
    /** Keeps the match count fresh when the data reloads under an active filter. */
    onStructureDataFiltered() {
      if (this.structureFilterApplied) this.updateStructureFilterMatches();
    },
    updateStructureFilterMatches() {
      this.structureFilterMatches = {
        matched: this.tabulator.getData("active").length,
        total: this.tabulator.getData().length,
      };
    },
  },
};

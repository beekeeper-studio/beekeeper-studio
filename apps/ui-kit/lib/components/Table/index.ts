import Table from "./Table.vue";
export { Table };
export * from "./types";

// FIXME These should probably be removed once we're finished extracting tables
export { HeaderSortTabulatorModule } from "./plugins/HeaderSortTabulatorModule";
export { KeyListenerTabulatorModule } from "./plugins/KeyListenerTabulatorModule";
export * from "./mixins/data_mutators";
export { default as Mutators } from "./mixins/data_mutators";
export * from "./mixins/tabulator";
export { default as Mutators2 } from "./mixins/tabulator";
export { Mutators as JsonFriendlyMutators } from "./mixins/jsonFriendlyMutators";
export * from "./tabulator";

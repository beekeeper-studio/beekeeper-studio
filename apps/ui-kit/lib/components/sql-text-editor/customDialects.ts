import {PostgreSQL, SQLDialect} from "@codemirror/lang-sql";

const GREENGAGE_EXTRA_KEYWORDS = [
  "distributed", "exchange", "inclusive", "list", "protocol", "resource",
  "retrieve", "subpartition", "text", "replicated",
].join(" ");

export const GreengageSQL = SQLDialect.define({
  ...PostgreSQL.spec,
  keywords: (PostgreSQL.spec.keywords || "") + " " + GREENGAGE_EXTRA_KEYWORDS,
});

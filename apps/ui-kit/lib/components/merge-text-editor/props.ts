import { PropType } from "vue";
import textEditorProps from "../text-editor/props";

export default {
  type: {
    type: String as PropType<"text" | "sql" | "surrealdb">,
    default: "text",
    validator: (value: string) => ["text", "sql", "surrealdb"].includes(value),
  },
  currentVersion: {
    type: String as PropType<string>,
    required: true,
  },
  previousVersion: {
    type: String as PropType<string>,
    required: true,
  },
  /** If false, display the current version only */
  showDiff: {
    type: Boolean as PropType<boolean>,
    default: false,
  },
  replaceExtensions: textEditorProps.replaceExtensions,
};

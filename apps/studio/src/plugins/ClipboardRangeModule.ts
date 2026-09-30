import { Module, RangeComponent, Tabulator } from "tabulator-tables";
import { buildCopyText, extractRanges } from "@/lib/menu/tableMenu";
import { ElectronPlugin } from "@/lib/NativeWrapper";

export type CopyRangesOptions = {
  type: "plain" | "tsv" | "json" | "markdown" | "sql" | "columnName" | "asIn";
  table?: string;
  schema?: string;
  escapeString?: (s: string, quote?: boolean) => string;
};

/**
 * Adds `table.copyRanges()`, which copies the selected ranges and leaves a
 * highlight over them until the next layout change.
 *
 * TODO: consider adding this to tabulator repo
 */
export default class ClipboardRangeModule extends Module {
  static moduleName = "clipboardRange";

  private highlights: HTMLElement[] = [];

  constructor(table: Tabulator) {
    super(table);

    this.copyRanges = this.copyRanges.bind(this);
    this.removeHighlights = this.removeHighlights.bind(this);
  }

  initialize() {
    this.registerTableFunction("copyRanges", this.copyRanges);

    this.subscribe("column-width", this.removeHighlights);
    this.subscribe("column-height", this.removeHighlights);
    this.subscribe("column-resized", this.removeHighlights);
    this.subscribe("cell-height", this.removeHighlights);
    this.subscribe("cell-edited", this.removeHighlights);
    this.subscribe("cell-resize", this.removeHighlights);
		this.subscribe("data-processed", this.removeHighlights);
    this.subscribe("edit-editor-clear", this.removeHighlights);
  }

  private async copyRanges(options: CopyRangesOptions) {
    const extracted = extractRanges(this.table.getRanges());
    const text = await buildCopyText(extracted.data, options);
    ElectronPlugin.clipboard.writeText(text);
    this.removeHighlights();
    this.addHighlights(extracted.sources);
  }

  private async addHighlights(ranges: RangeComponent[]) {
    const highlights: HTMLElement[] = [];

    ranges.forEach((range) => {
      const rangeEl = range.getElement() as HTMLElement;
      const highlight = rangeEl.cloneNode() as HTMLElement;
      rangeEl.classList.add("copied");
      highlight.classList.add("tabulator-range-copy-highlight");
      highlights.push(highlight);
    });

    const container = this.table.modules.selectRange.rangeContainer;
    container.append(...highlights);
    this.highlights = highlights;
  }

  private async removeHighlights() {
    if (this.highlights.length > 0) {
      this.highlights.forEach((el) => el.remove());
      this.highlights = [];
    }
  }
}

declare module "tabulator-tables" {
  interface Tabulator {
    copyRanges(options: CopyRangesOptions): Promise<void>;
  }
}

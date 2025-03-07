/**
 * This plugin sets the whole editor to be read-only except for some defined
 * ranges. **/

import _ from "lodash";
import { EditorRange, isPositionWithin } from "@/lib/editor/utils";
import { TextEditorPlugin } from "./TextEditorPlugin";
import CodeMirror from "codemirror";
// FIXME (azmi): maybe use json-ource-map instead?

const EDITABLE_MARKER_CLASSNAME = "bks-editable-marker";
const EDITABLE_MARKER_ACTIVE_CLASSNAME = "bks-editable-marker-active";
const EDITABLE_MARKER_ATTR_ID = "data-bks-editable-id";

export default class PartialReadOnlyPlugin extends TextEditorPlugin {
  name = "partialReadOnly";
  rangeMap = new Map<
    string,
    {
      range: EditorRange;
      marker: CodeMirror.TextMarker;
    }
  >();
  activeMarkerId?: string;
  editor: CodeMirror.Editor;

  constructor(
    private ranges: EditorRange[],
    private onEditableRangeChange?: (range: EditorRange, value: string) => void
  ) {
    super();

    this.handleBeforeChange = this.handleBeforeChange.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleCursorActivity = this.handleCursorActivity.bind(this);
  }

  initialize(editor: CodeMirror.Editor) {
    if (editor.getOption("readOnly")) {
      throw new Error(
        "PartialReadOnlyPlugin requires `readOnly` to be disabled."
      );
    }

    this.editor = editor;

    this.ranges.forEach((range) => {
      const marker = editor.markText(range.from, range.to, {
        className: EDITABLE_MARKER_CLASSNAME,
        inclusiveLeft: true, // text inserted on the left will be included
        inclusiveRight: true, // text inserted on the right will be included
        clearWhenEmpty: false,
        // @ts-expect-error not fully typed
        attributes: { [EDITABLE_MARKER_ATTR_ID]: range.id },
      });
      this.rangeMap.set(range.id, {
        range,
        marker,
      });
    });

    this.editor.on("beforeChange", this.handleBeforeChange);
    this.editor.on("change", this.handleChange);
    this.editor.on("cursorActivity", this.handleCursorActivity);
  }

  destroy(): void {
    this.rangeMap.forEach((range) => range.marker.clear());
    if (this.editor) {
      this.editor.off("beforeChange", this.handleBeforeChange);
      this.editor.off("change", this.handleChange);
      this.editor.off("cursorActivity", this.handleCursorActivity);
    }
  }

  handleBeforeChange(
    cm: CodeMirror.Editor,
    changeObj: CodeMirror.EditorChangeCancellable
  ) {
    if (changeObj.origin !== "setValue") {
      let markers = cm.findMarks(changeObj.from, changeObj.to);
      if (markers.length === 0) {
        markers = cm.findMarksAt(changeObj.from);
      }

      for (const marker of markers) {
        if (
          this.getMarkerId(marker) &&
          isPositionWithin(changeObj, marker.find())
        ) {
          return;
        }
      }
      changeObj.cancel();
    }
  }

  handleChange(
    cm: CodeMirror.Editor,
    changeObj: CodeMirror.EditorChangeLinkedList
  ){
    // Skip the whole process if there is no callback
    if (!this.onEditableRangeChange) {
      return;
    }

    if (changeObj.origin !== "setValue") {
      const markers = cm.findMarksAt(changeObj.from);
      for (const marker of markers) {
        if (!this.getMarkerId(marker)) {
          continue;
        }
        const { range } = this.rangeMap.get(this.getMarkerId(marker));
        const value = this.getMarkerValue(marker);
        this.onEditableRangeChange(range, value);
      }
    }
  };

  handleCursorActivity(cm: CodeMirror.Editor) {
    const cursor = cm.getCursor();
    const markers = cm.findMarksAt(cursor);
    const activeMarker = this.findActiveMarker(markers);

    let activeMarkerId: string;

    if (activeMarker) {
      activeMarkerId = this.getMarkerId(activeMarker);
      setTimeout(() => {
        this.highlightMarker(activeMarkerId);
      })
    }

    if (this.activeMarkerId && this.activeMarkerId !== activeMarkerId) {
      this.unHighlightMarker(this.activeMarkerId);
    }

    this.activeMarkerId = activeMarkerId;
        // setTimeout(() => {
        //   this.highlightMarker(this.getMarkerId(marker));
        // }, 0)
  };

  highlightMarker(markerId: string) {
    const markerEls = this.editor
      .getWrapperElement()
      .querySelectorAll(`[${EDITABLE_MARKER_ATTR_ID}="${markerId}"]`);

    markerEls.forEach((el) => {
      el.classList.toggle(EDITABLE_MARKER_ACTIVE_CLASSNAME, true);
    });
  }

  unHighlightMarker(markerId: string) {
    const markerEls = this.editor
      .getWrapperElement()
      .querySelectorAll(`[${EDITABLE_MARKER_ATTR_ID}="${markerId}"]`);
    markerEls.forEach((el) => {
      el.classList.toggle(EDITABLE_MARKER_ACTIVE_CLASSNAME, false);
    });
  }

  findActiveMarker(markers: CodeMirror.TextMarker[]) {
    return markers.find((marker) => this.getMarkerId(marker));
  }

  getMarkerValue(marker: CodeMirror.TextMarker) {
    const { from, to } = marker.find();
    return this.editor.getRange(from, to);
  }

  getMarkerId(marker: CodeMirror.TextMarker) {
    // @ts-expect-error not fully typed
    return marker.attributes?.[EDITABLE_MARKER_ATTR_ID];
  }
}

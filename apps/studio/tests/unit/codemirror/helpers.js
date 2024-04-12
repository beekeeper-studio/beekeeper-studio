import CodeMirror from "codemirror";
import "@/vendor/sql-hint/index";
import "../../../src/lib/editor/CodeMirrorDefinitions";
import {
  registerAutoquote,
  autoquoteHandler,
} from "../../../src/lib/editor/CodeMirrorPlugins";
import _ from 'lodash';

class Editor {
  constructor(opts = {}) {
    this.textarea = document.createElement("textarea");
    document.body.appendChild(this.textarea);

    this.cm = CodeMirror.fromTextArea(this.textarea, {
      ...opts,
      mode: opts.mode || "text/x-mysql",
    });

    this.cm.setValue(opts.value || "");
  }

  async complete(completeTo) {
    function mockedBeforeChange(cm, co) {
      co.origin = "complete";
      autoquoteHandler(cm, co);
    }

    const unregisterAutoquote = registerAutoquote(this.cm, mockedBeforeChange);

    const hint = await this.hint();

    this.cm.replaceRange(completeTo, hint.from, hint.to);

    unregisterAutoquote(this.cm, mockedBeforeChange);
  }

  async hint() {
    return await CodeMirror.hint.sql(this.cm, {
      tables: this.cm.getOption("tables"),
      defaultTable: this.cm.getOption("defaultTable"),
      disableKeywords: this.cm.getOption("disableKeywords"),
    });
  }

  destroy() {
    document.body.removeChild(this.textarea);
  }
}

function _testCompletions(it, name, spec) {
  it(name, async () => {
    const editor = new Editor({
      mode: spec.mode || "text/x-mysql",
      value: spec.value,
      getColumns: spec.getColumns,
      tables: spec.tables,
      defaultTable: spec.defaultTable,
      disableKeywords: spec.disableKeywords,
    });
    editor.cm.setCursor(spec.cursor);
    const completions = await editor.hint();
    expect(_.sortBy(completions.list, ['text'])).toEqual(_.sortBy(spec.list, ['text']));
    expect(completions.from).toEqual(spec.from);
    expect(completions.to).toEqual(spec.to);
    editor.destroy();
  });
}

function _testAutoquotes(it, name, spec) {
  it(name, async () => {
    const editor = new Editor({
      mode: "text/x-pgsql",
      tables: spec.tables,
      value: spec.value,
    });
    editor.cm.setCursor(spec.cursor);
    await editor.complete(spec.completeTo);
    expect(editor.cm.getValue()).toBe(spec.result);
    editor.destroy();
  });
}

/** @type jest.It */
export const testCompletions = _testCompletions.bind(test, test);
testCompletions['only'] = _testCompletions.bind(null, test['only']);
testCompletions['skip'] = _testCompletions.bind(null, test['skip']);

/** @type jest.It */
export const testAutoquotes = _testAutoquotes.bind(test, test);
testAutoquotes["only"] = _testAutoquotes.bind(null, test["only"]);
testAutoquotes["skip"] = _testAutoquotes.bind(null, test["skip"]);

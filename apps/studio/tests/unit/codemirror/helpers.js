import CodeMirror from "codemirror";
import "@/vendor/sql-hint/index";
import "@/lib/codemirror"

export const Pos = CodeMirror.Pos;

function _testCompletions(it, name, spec) {
  it(name, async () => {
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    const cm = CodeMirror.fromTextArea(textarea, {
      mode: spec.mode || "text/x-mysql",
      value: spec.value,
      getColumns: spec.getColumns,
    });
    cm.setValue(spec.value);
    cm.setCursor(spec.cursor);
    const completions = await CodeMirror.hint.sql(cm, {
      tables: spec.tables,
      defaultTable: spec.defaultTable,
      disableKeywords: spec.disableKeywords,
    });
    expect(spec.list.sort()).toEqual(completions.list.sort());
    expect(spec.from).toEqual(completions.from);
    expect(spec.to).toEqual(completions.to);
    document.body.removeChild(textarea);
  });
}

/** @type jest.It */
export const testCompletions = _testCompletions.bind(test, test);
testCompletions['only'] = _testCompletions.bind(null, test['only']);
testCompletions['skip'] = _testCompletions.bind(null, test['skip']);

import CodeMirror from "codemirror";
import '@/plugins/CMMongoMode';
import '@/plugins/CMMongoHint';
import _ from 'lodash';

class Editor {
  textarea: HTMLTextAreaElement;
  cm: CodeMirror.EditorFromTextArea;

  constructor(opts: any = {}) {
    this.textarea = document.createElement("textarea");
    document.body.appendChild(this.textarea);

    this.cm = CodeMirror.fromTextArea(this.textarea, {
      mode: 'mongo'
    });

    // Save options for direct access 
    this.connection = opts.connection;
    this.promptLine = opts.promptLine || 0;
    this.promptSymbol = opts.promptSymbol || '';

    this.cm.setValue(opts.value || "");
  }

  // Add properties to access in the hint method
  connection: any;
  promptLine: number;
  promptSymbol: string;

  async hint() {
    // Use local instance properties directly
    const options = {
      promptLine: this.promptLine,
      promptSymbol: this.promptSymbol,
      connection: this.connection
    };

    // @ts-expect-error not fully typed
    const result = await CodeMirror.hint.mongo(this.cm, options);
    return result;
  }

  destroy() {
    document.body.removeChild(this.textarea);
  }
}

// Keep a reference to the connection at the module level
let globalConnection: any = null;

// Function to set the global connection
export function setConnectionForTests(conn: any) {
  globalConnection = conn;
}

// Try a different way of defining the test function
export function testCompletions(name: string, spec: any) {
  it(name, async () => {
    const editor = new Editor({
      value: spec.value,
      connection: globalConnection, // Use the global connection
      promptLine: spec.promptLine,
      promptSymbol: spec.promptSymbol
    });

    if (spec.cursor) {
      editor.cm.setCursor(spec.cursor);
    }
    
    const completions = await editor.hint();
    
    expect(spec.list(completions.list)).toBe(true);
    expect(completions.from.line).toEqual(spec.from.line);
    expect(completions.from.ch).toEqual(spec.from.ch);
    expect(completions.to.line).toEqual(spec.to.line);
    expect(completions.to.ch).toEqual(spec.to.ch)
    
    editor.destroy();
  });
}

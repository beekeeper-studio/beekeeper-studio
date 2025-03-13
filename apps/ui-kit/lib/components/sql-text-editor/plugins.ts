import CodeMirror from "codemirror";
import { removeQueryQuotes } from "../../utils/sql";
import _ from "lodash";
import { Options } from "sql-query-identifier";

export function autoquoteHandler(
  instance: CodeMirror.Editor,
  changeObj: CodeMirror.EditorChangeCancellable
) {
  const mode = instance.getOption("mode");
  if (typeof mode === "string" && !mode.includes("pgsql")) return;

  const { to, from, origin, text } = changeObj;

  // eslint-disable-next-line
  // @ts-ignore
  const keywords = CodeMirror.resolveMode(instance.getOption("mode")).keywords;

  // quote names when needed
  if (origin === "complete" && keywords[text[0].toLowerCase()] != true) {
    // eslint-disable-next-line
    // @ts-ignore
    const alias = instance.activeAlias;
    const names = text[0]
      .match(/("[^"]*"|[^.]+)/g)
      .map((n) => (/^\d/.test(n) && n !== alias ? `"${n}"` : n))
      .map((n) =>
        /[^a-z0-9_]/.test(n) && !/"/.test(n) && n !== alias ? `"${n}"` : n
      )
      .join(".");

    changeObj.update(from, to, [names]);
  }
}

export function removeQueryQuotesHandler(
  dialect: Options["dialect"],
  instance: CodeMirror.Editor,
  e: ClipboardEvent
) {
  e.preventDefault();
  let clipboard = (e.clipboardData.getData("text") as string).trim();
  clipboard = removeQueryQuotes(clipboard, dialect);
  if (instance.getSelection()) {
    instance.replaceSelection(clipboard, "around");
  } else {
    const cursor = instance.getCursor();
    instance.replaceRange(clipboard, cursor);
  }
}

export function autocompleteHandler(
  instance: CodeMirror.Editor,
  e: KeyboardEvent
) {
  // TODO: make this not suck
  // BUGS:
  // 1. only on periods if not in a quote
  // 2. post-space trigger after a few SQL keywords
  //    - from, join
  const triggerWords = ["from", "join"];
  const triggers = {
    "190": "period",
  };
  const space = 32;
  const backspace = 8;
  const delete_key = 46;
  const z_key = 90;
  // const underscore = 189

  if (instance.state.completionActive) return;
  
  // Handle Ctrl+Z/Cmd+Z undo operation
  if (e.keyCode === z_key && (e.ctrlKey || e.metaKey)) {
    // Don't return immediately, let the event propagate
    // Delay execution to wait for undo operation to complete
    setTimeout(() => {
      // Get context at current cursor position
      const cursor = instance.getCursor();
      const line = instance.getLine(cursor.line);
      
      // Check if we're in a table name selection context (after FROM or JOIN)
      const lineUntilCursor = line.substring(0, cursor.ch);
      // More precise regex to match table name part after FROM or JOIN
      const fromRegex = /\b(from|join)\s+[\w\d_."]*$/i;
      
      if (fromRegex.test(lineUntilCursor)) {
        if (!instance.state.completionActive) {
          // eslint-disable-next-line
          // @ts-ignore
          CodeMirror.commands.autocomplete(instance, null, {
            completeSingle: false,
          });
        }
      }
    }, 100); // Add delay to ensure undo operation completes
  }
  
  // Handle delete and backspace keys
  if (e.keyCode === backspace || e.keyCode === delete_key) {
    // Get context at current cursor position
    const cursor = instance.getCursor();
    const line = instance.getLine(cursor.line);
    
    // Check if we're in a table name selection context (after FROM or JOIN)
    const lineUntilCursor = line.substring(0, cursor.ch);
    const fromRegex = /\b(from|join)\s+[\w\d_."]*$/i;
    
    if (fromRegex.test(lineUntilCursor)) {
      if (!instance.state.completionActive) {
        // eslint-disable-next-line
        // @ts-ignore
        CodeMirror.commands.autocomplete(instance, null, {
          completeSingle: false,
        });
      }
    }
    return;
  }
  
  if (triggers[e.keyCode]) {
    // eslint-disable-next-line
    // @ts-ignore
    CodeMirror.commands.autocomplete(instance, null, {
      completeSingle: false,
    });
  }
  if (e.keyCode === space) {
    try {
      const pos = _.clone(instance.getCursor());
      if (pos.ch > 0) {
        pos.ch = pos.ch - 2;
      }
      const word = instance.findWordAt(pos);
      const lastWord = instance.getRange(word.anchor, word.head);
      if (!triggerWords.includes(lastWord.toLowerCase())) return;
      // eslint-disable-next-line
      // @ts-ignore
      CodeMirror.commands.autocomplete(instance, null, {
        completeSingle: false,
      });
    } catch (ex) {
      // do nothing
    }
  }
}

// Register a new handler for undo operations
export function registerUndoHandler(instance: CodeMirror.Editor) {
  // Listen for CodeMirror undo events
  const handleUndo = (cm: CodeMirror.Editor, changeObj: CodeMirror.EditorChangeCancellable) => {
    if (changeObj.origin === "undo") {
      // Add delay to ensure undo operation completes
      setTimeout(() => {
        const cursor = cm.getCursor();
        const line = cm.getLine(cursor.line);
        
        // Check if we're in a table name selection context (after FROM or JOIN)
        const lineUntilCursor = line.substring(0, cursor.ch);
        const fromRegex = /\b(from|join)\s+[\w\d_."]*$/i;
        
        if (fromRegex.test(lineUntilCursor) && !cm.state.completionActive) {
          // eslint-disable-next-line
          // @ts-ignore
          CodeMirror.commands.autocomplete(cm, null, {
            completeSingle: false,
          });
        }
      }, 100);
    }
  };
  
  instance.on("beforeChange", handleUndo);
  
  return () => instance.off("beforeChange", handleUndo);
}

function registerAutoquote(
  instance: CodeMirror.Editor,
  onBeforeChange?: (
    instance: CodeMirror.Editor,
    changeObj: CodeMirror.EditorChangeCancellable
  ) => void
) {
  instance.on("beforeChange", onBeforeChange ?? autoquoteHandler);
  return () => instance.off("beforeChange", onBeforeChange ?? autoquoteHandler);
}

function registerAutoRemoveQueryQuotes(
  dialect: Options["dialect"],
  instance: CodeMirror.Editor
) {
  const handler = removeQueryQuotesHandler.bind(null, dialect);
  instance.on("paste", handler);
  return () => instance.off("paste", handler);
}

function registerAutoComplete(instance: CodeMirror.Editor) {
  instance.on("keyup", autocompleteHandler);
  // Register undo handler
  const undoCleanup = registerUndoHandler(instance);
  return () => {
    instance.off("keyup", autocompleteHandler);
    undoCleanup();
  };
}

export const autoquote = registerAutoquote;
export const autoComplete = registerAutoComplete;
export const autoRemoveQueryQuotes = (dialect?: Options["dialect"]) =>
  registerAutoRemoveQueryQuotes.bind(null, dialect);

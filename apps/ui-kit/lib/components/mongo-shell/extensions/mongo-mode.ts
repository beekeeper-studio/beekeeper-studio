import { Extension } from '@codemirror/state';
import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';

// Prompt regex matching the original CMMongoMode
const PROMPT_REGEX = /^[^\n]+>\s/;

// Define decoration for mongo prompts
const mongoPromptDecoration = Decoration.mark({
  class: 'cm-mongo-prompt'
});

// View plugin to add prompt decorations
const mongoPromptPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = this.buildDecorations(view);
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.buildDecorations(update.view);
    }
  }

  buildDecorations(view: EditorView) {
    const builder = new RangeSetBuilder<Decoration>();
    
    for (let { from, to } of view.visibleRanges) {
      for (let pos = from; pos <= to;) {
        const line = view.state.doc.lineAt(pos);
        const lineText = line.text;
        
        // Check if line matches prompt pattern
        const match = lineText.match(PROMPT_REGEX);
        if (match) {
          builder.add(line.from, line.from + match[0].length, mongoPromptDecoration);
        }
        
        pos = line.to + 1;
      }
    }
    
    return builder.finish();
  }
}, {
  decorations: v => v.decorations
});

// Export the complete mongo mode extension
export function mongoMode(): Extension {
  return [
    javascript(),
    mongoPromptPlugin
  ];
}

// Export the plugin if needed
export { mongoPromptPlugin };

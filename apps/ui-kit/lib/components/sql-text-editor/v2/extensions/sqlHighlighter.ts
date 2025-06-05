import { syntaxTree } from "@codemirror/language";
import { Decoration, ViewPlugin, DecorationSet, ViewUpdate, EditorView } from "@codemirror/view";

// This plugin will decorate alias identifiers in SQL
const aliasHighlighter = ViewPlugin.fromClass(
  class {
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
      const decorations: any[] = [];
      const doc = view.state.doc.toString();

      console.log('Building decorations for:', doc);

      // Collect all aliases first
      const aliases = new Set<string>();
      
      // Simple regex-based approach for FROM clauses
      const fromRegex = /FROM\s+(\w+)\s+(?:AS\s+)?(\w+)/gi;
      let match;
      
      // Check FROM clauses
      while ((match = fromRegex.exec(doc)) !== null) {
        const aliasStart = match.index + match[0].lastIndexOf(match[2]);
        const aliasEnd = aliasStart + match[2].length;
        const aliasName = match[2];
        
        console.log('Found FROM alias:', aliasName, 'at', aliasStart, '-', aliasEnd);
        
        aliases.add(aliasName);
        
        const aliasDeco = Decoration.mark({
          class: "cm-sql-alias"
        }).range(aliasStart, aliasEnd);
        decorations.push(aliasDeco);
      }
      
      // Check JOIN clauses  
      const joinRegex = /JOIN\s+(\w+)\s+(?:AS\s+)?(\w+)/gi;
      while ((match = joinRegex.exec(doc)) !== null) {
        const aliasStart = match.index + match[0].lastIndexOf(match[2]);
        const aliasEnd = aliasStart + match[2].length;
        const aliasName = match[2];
        
        console.log('Found JOIN alias:', aliasName, 'at', aliasStart, '-', aliasEnd);
        
        aliases.add(aliasName);
        
        const aliasDeco = Decoration.mark({
          class: "cm-sql-alias"
        }).range(aliasStart, aliasEnd);
        decorations.push(aliasDeco);
      }

      // Now find all usage of these aliases and their fields
      aliases.forEach(alias => {
        const aliasUsageRegex = new RegExp(`\\b${alias}\\.(\\w+)`, 'gi');
        let usageMatch;
        
        while ((usageMatch = aliasUsageRegex.exec(doc)) !== null) {
          const aliasStart = usageMatch.index;
          const aliasEnd = aliasStart + alias.length;
          const fieldStart = aliasStart + alias.length + 1; // +1 for the dot
          const fieldEnd = fieldStart + usageMatch[1].length;
          
          console.log('Found alias usage:', alias, 'at', aliasStart, '-', aliasEnd);
          console.log('Found field:', usageMatch[1], 'at', fieldStart, '-', fieldEnd);

          // Highlight the alias
          const aliasDeco = Decoration.mark({
            class: "cm-sql-alias"
          }).range(aliasStart, aliasEnd);
          decorations.push(aliasDeco);

          // Highlight the field
          const fieldDeco = Decoration.mark({
            class: "cm-sql-field"
          }).range(fieldStart, fieldEnd);
          decorations.push(fieldDeco);
        }
      });

      console.log('Total decorations:', decorations.length);
      
      // Sort decorations by position
      decorations.sort((a, b) => a.from - b.from);
      
      return Decoration.set(decorations);
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

export { aliasHighlighter as sqlHighlighter };

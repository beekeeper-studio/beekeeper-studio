/** CSS Variables that are passed to plugins. */
export const cssVars = [
  "--font-size",
  "--font-family",
  "--font-family-mono",

  "--theme-bg",
  "--theme-base",
  "--theme-primary",
  "--theme-secondary",

  "--text-dark",
  "--text",
  "--text-light",
  "--text-lighter",
  "--text-hint",
  "--text-disabled",

  "--brand-info",
  "--brand-success",
  "--brand-warning",
  "--brand-danger",
  "--brand-default",
  "--brand-purple",
  "--brand-pink",

  "--border-color",
  "--link-color",
  "--placeholder",
  "--selection",
  "--input-highlight",

  "--query-editor-bg",
  "--menu-bg",
  "--menu-shadow",

  "--scrollbar-track",
  "--scrollbar-thumb",

  // BksTextEditor
  "--text-editor-activeline-bg",
  "--text-editor-activeline-gutter-bg",
  "--text-editor-atom-fg",
  "--text-editor-bg",
  "--text-editor-bracket-fg",
  "--text-editor-builtin-fg",
  "--text-editor-comment-attribute-fg",
  "--text-editor-comment-def-fg",
  "--text-editor-comment-fg",
  "--text-editor-comment-tag-fg",
  "--text-editor-comment-type-fg",
  "--text-editor-cursor-bg",
  "--text-editor-fatcursor-bg",
  "--text-editor-def-fg",
  "--text-editor-error-bg",
  "--text-editor-error-fg",
  "--text-editor-fg",
  "--text-editor-focused-outline",
  "--text-editor-font-size",
  "--text-editor-foldgutter-fg",
  "--text-editor-foldgutter-fg-hover",
  "--text-editor-gutter-bg",
  "--text-editor-gutter-border",
  "--text-editor-guttermarker-fg",
  "--text-editor-guttermarker-subtle-fg",
  "--text-editor-header-fg",
  "--text-editor-highlight-bg",
  "--text-editor-indent-marker-bg",
  "--text-editor-indent-marker-active-bg",
  "--text-editor-keyword-fg",
  "--text-editor-linenumber-fg",
  "--text-editor-link-fg",
  "--text-editor-matchingbracket-fg",
  "--text-editor-matchingbracket-bg",
  "--text-editor-number-fg",
  "--text-editor-property-fg",
  "--text-editor-selected-bg",
  "--text-editor-matchingselection-bg",
  "--text-editor-string-fg",
  "--text-editor-tag-fg",
  "--text-editor-variable-2-fg",
  "--text-editor-variable-3-fg",
  "--text-editor-variable-fg",
  "--text-editor-namespace-fg",
  "--text-editor-type-fg",
  "--text-editor-class-fg",
  "--text-editor-enum-fg",
  "--text-editor-interface-fg",
  "--text-editor-struct-fg",
  "--text-editor-typeParameter-fg",
  "--text-editor-parameter-fg",
  "--text-editor-enumMember-fg",
  "--text-editor-decorator-fg",
  "--text-editor-event-fg",
  "--text-editor-function-fg",
  "--text-editor-method-fg",
  "--text-editor-macro-fg",
  "--text-editor-label-fg",
  "--text-editor-regexp-fg",
  "--text-editor-operator-fg",
  "--text-editor-definition-fg",
  "--text-editor-variableName-fg",
  "--text-editor-bool-fg",
  "--text-editor-null-fg",
  "--text-editor-className-fg",
  "--text-editor-propertyName-fg",
  "--text-editor-punctuation-fg",
  "--text-editor-meta-fg",
  "--text-editor-typeName-fg",
  "--text-editor-labelName-fg",
  "--text-editor-attributeName-fg",
  "--text-editor-attributeValue-fg",
  "--text-editor-heading-fg",
  "--text-editor-url-fg",
  "--text-editor-processingInstruction-fg",
  "--text-editor-special-string-fg",
  "--text-editor-name-fg",
  "--text-editor-deleted-fg",
  "--text-editor-character-fg",
  "--text-editor-fg",
  "--text-editor-standard-fg",
  "--text-editor-separator-fg",
  "--text-editor-changed-fg",
  "--text-editor-annotation-fg",
  "--text-editor-modifier-fg",
  "--text-editor-self-fg",
  "--text-editor-operatorKeyword-fg",
  "--text-editor-escape-fg",
  "--text-editor-strong-fg",
  "--text-editor-emphasis-fg",
  "--text-editor-strikethrough-fg",
  "--text-editor-sql-alias-fg",
  "--text-editor-sql-field-fg",

  // BksTextEditor context menu
  "--text-editor-context-menu-bg",
  "--text-editor-context-menu-fg",
  "--text-editor-context-menu-item-bg-active",
  "--text-editor-context-menu-item-fg-active",
  "--text-editor-context-menu-item-bg-hover",
] as const;

/** Map legacy UI Kit CSS variables to new ones. Old AI Shell and ER Diagram use these. */
export const legacyUiKitCssString = /*css*/`
  --bks-text-editor-activeline-bg-color: var(--text-editor-activeline-bg);
  --bks-text-editor-activeline-gutter-bg-color: var(--text-editor-activeline-gutter-bg);
  --bks-text-editor-annotation-fg-color: var(--text-editor-annotation-fg);
  --bks-text-editor-atom-fg-color: var(--text-editor-atom-fg);
  --bks-text-editor-attributeName-fg-color: var(--text-editor-attributeName-fg);
  --bks-text-editor-attributeValue-fg-color: var(--text-editor-attributeValue-fg);
  --bks-text-editor-bg-color: var(--text-editor-bg);
  --bks-text-editor-bool-fg-color: var(--text-editor-bool-fg);
  --bks-text-editor-bracket-fg-color: var(--text-editor-bracket-fg);
  --bks-text-editor-builtin-fg-color: var(--text-editor-builtin-fg);
  --bks-text-editor-button-bg-color: var(--text-editor-button-bg);
  --bks-text-editor-changed-fg-color: var(--text-editor-changed-fg);
  --bks-text-editor-character-fg-color: var(--text-editor-character-fg);
  --bks-text-editor-class-fg-color: var(--text-editor-class-fg);
  --bks-text-editor-className-fg-color: var(--text-editor-className-fg);
  --bks-text-editor-color-fg-color: var(--text-editor-fg);
  --bks-text-editor-comment-attribute-fg-color: var(--text-editor-comment-attribute-fg);
  --bks-text-editor-comment-def-fg-color: var(--text-editor-comment-def-fg);
  --bks-text-editor-comment-fg-color: var(--text-editor-comment-fg);
  --bks-text-editor-comment-tag-fg-color: var(--text-editor-comment-tag-fg);
  --bks-text-editor-comment-type-fg-color: var(--text-editor-comment-type-fg);
  --bks-text-editor-context-menu-bg-color: var(--text-editor-context-menu-bg);
  --bks-text-editor-context-menu-border-color: var(--text-editor-context-menu-border);
  --bks-text-editor-context-menu-fg-color: var(--text-editor-context-menu-fg);
  --bks-text-editor-context-menu-item-bg-color-active: var(--text-editor-context-menu-item-bg-active);
  --bks-text-editor-context-menu-item-bg-color-hover: var(--text-editor-context-menu-item-bg-hover);
  --bks-text-editor-context-menu-item-fg-color-active: var(--text-editor-context-menu-item-fg-active);
  --bks-text-editor-cursor-bg-color: var(--text-editor-cursor-bg);
  --bks-text-editor-decorator-fg-color: var(--text-editor-decorator-fg);
  --bks-text-editor-def-fg-color: var(--text-editor-def-fg);
  --bks-text-editor-definition-fg-color: var(--text-editor-definition-fg);
  --bks-text-editor-deleted-fg-color: var(--text-editor-deleted-fg);
  --bks-text-editor-emphasis-fg-color: var(--text-editor-emphasis-fg);
  --bks-text-editor-enum-fg-color: var(--text-editor-enum-fg);
  --bks-text-editor-enumMember-fg-color: var(--text-editor-enumMember-fg);
  --bks-text-editor-error-bg-color: var(--text-editor-error-bg);
  --bks-text-editor-error-fg-color: var(--text-editor-error-fg);
  --bks-text-editor-escape-fg-color: var(--text-editor-escape-fg);
  --bks-text-editor-event-fg-color: var(--text-editor-event-fg);
  --bks-text-editor-fatcursor-bg-color: var(--text-editor-fatcursor-bg);
  --bks-text-editor-fg-color: var(--text-editor-fg);
  --bks-text-editor-focused-outline-color: var(--text-editor-focused-outline);
  --bks-text-editor-foldgutter-fg-color: var(--text-editor-foldgutter-fg);
  --bks-text-editor-foldgutter-fg-color-hover: var(--text-editor-foldgutter-fg-hover);
  --bks-text-editor-font-family: var(--text-editor-font-family);
  --bks-text-editor-font-size: var(--text-editor-font-size);
  --bks-text-editor-function-fg-color: var(--text-editor-function-fg);
  --bks-text-editor-gutter-bg-color: var(--text-editor-gutter-bg);
  --bks-text-editor-gutter-border-color: var(--text-editor-gutter-border);
  --bks-text-editor-guttermarker-fg-color: var(--text-editor-guttermarker-fg);
  --bks-text-editor-guttermarker-subtle-fg-color: var(--text-editor-guttermarker-subtle-fg);
  --bks-text-editor-header-fg-color: var(--text-editor-header-fg);
  --bks-text-editor-heading-fg-color: var(--text-editor-heading-fg);
  --bks-text-editor-highlight-bg-color: var(--text-editor-highlight-bg);
  --bks-text-editor-indent-marker-active-bg-color: var(--text-editor-indent-marker-active-bg);
  --bks-text-editor-indent-marker-bg-color: var(--text-editor-indent-marker-bg);
  --bks-text-editor-interface-fg-color: var(--text-editor-interface-fg);
  --bks-text-editor-keyword-fg-color: var(--text-editor-keyword-fg);
  --bks-text-editor-label-fg-color: var(--text-editor-label-fg);
  --bks-text-editor-labelName-fg-color: var(--text-editor-labelName-fg);
  --bks-text-editor-linenumber-fg-color: var(--text-editor-linenumber-fg);
  --bks-text-editor-link-fg-color: var(--text-editor-link-fg);
  --bks-text-editor-macro-fg-color: var(--text-editor-macro-fg);
  --bks-text-editor-matchingbracket-bg-color: var(--text-editor-matchingbracket-bg);
  --bks-text-editor-matchingbracket-fg-color: var(--text-editor-matchingbracket-fg);
  --bks-text-editor-matchingselection-bg-color: var(--text-editor-matchingselection-bg);
  --bks-text-editor-meta-fg-color: var(--text-editor-meta-fg);
  --bks-text-editor-method-fg-color: var(--text-editor-method-fg);
  --bks-text-editor-modifier-fg-color: var(--text-editor-modifier-fg);
  --bks-text-editor-name-fg-color: var(--text-editor-name-fg);
  --bks-text-editor-namespace-fg-color: var(--text-editor-namespace-fg);
  --bks-text-editor-null-fg-color: var(--text-editor-null-fg);
  --bks-text-editor-number-fg-color: var(--text-editor-number-fg);
  --bks-text-editor-operator-fg-color: var(--text-editor-operator-fg);
  --bks-text-editor-operatorKeyword-fg-color: var(--text-editor-operatorKeyword-fg);
  --bks-text-editor-panel-bg-color: var(--text-editor-panel-bg);
  --bks-text-editor-panel-fg-color: var(--text-editor-panel-fg);
  --bks-text-editor-parameter-fg-color: var(--text-editor-parameter-fg);
  --bks-text-editor-processingInstruction-fg-color: var(--text-editor-processingInstruction-fg);
  --bks-text-editor-property-fg-color: var(--text-editor-property-fg);
  --bks-text-editor-propertyName-fg-color: var(--text-editor-propertyName-fg);
  --bks-text-editor-punctuation-fg-color: var(--text-editor-punctuation-fg);
  --bks-text-editor-regexp-fg-color: var(--text-editor-regexp-fg);
  --bks-text-editor-searchmatch-bg-color: var(--text-editor-searchmatch-bg);
  --bks-text-editor-searchmatch-selected-bg-color: var(--text-editor-searchmatch-selected-bg);
  --bks-text-editor-selected-bg-color: var(--text-editor-selected-bg);
  --bks-text-editor-self-fg-color: var(--text-editor-self-fg);
  --bks-text-editor-separator-fg-color: var(--text-editor-separator-fg);
  --bks-text-editor-special-string-fg-color: var(--text-editor-special-string-fg);
  --bks-text-editor-sql-alias-fg-color: var(--text-editor-sql-alias-fg);
  --bks-text-editor-sql-field-fg-color: var(--text-editor-sql-field-fg);
  --bks-text-editor-standard-fg-color: var(--text-editor-standard-fg);
  --bks-text-editor-strikethrough-fg-color: var(--text-editor-strikethrough-fg);
  --bks-text-editor-string-fg-color: var(--text-editor-string-fg);
  --bks-text-editor-strong-fg-color: var(--text-editor-strong-fg);
  --bks-text-editor-struct-fg-color: var(--text-editor-struct-fg);
  --bks-text-editor-tag-fg-color: var(--text-editor-tag-fg);
  --bks-text-editor-type-fg-color: var(--text-editor-type-fg);
  --bks-text-editor-typeName-fg-color: var(--text-editor-typeName-fg);
  --bks-text-editor-typeParameter-fg-color: var(--text-editor-typeParameter-fg);
  --bks-text-editor-url-fg-color: var(--text-editor-url-fg);
  --bks-text-editor-variable-2-fg-color: var(--text-editor-variable-2-fg);
  --bks-text-editor-variable-3-fg-color: var(--text-editor-variable-3-fg);
  --bks-text-editor-variable-fg-color: var(--text-editor-variable-fg);
  --bks-text-editor-variableName-fg-color: var(--text-editor-variableName-fg);
  --bks-text-editor-vim-panel-bg-color: var(--text-editor-vim-panel-bg);
  --bks-text-editor-vim-panel-border: var(--text-editor-vim-panel-border);
  --bks-text-editor-vim-panel-fg-color: var(--text-editor-vim-panel-fg);
  --bks-text-editor-vim-panel-font-size: var(--text-editor-vim-panel-font-size);
`;

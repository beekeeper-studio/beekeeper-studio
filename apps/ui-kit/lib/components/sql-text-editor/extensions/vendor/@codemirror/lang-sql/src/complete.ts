import {Completion, CompletionContext, CompletionSource, completeFromList, ifNotIn} from "@codemirror/autocomplete"
import {EditorState, Facet, StateEffect, StateField, Text} from "@codemirror/state"
import {syntaxTree} from "@codemirror/language"
import {SyntaxNode} from "@lezer/common"
import {type SQLDialect, SQLNamespace} from "@codemirror/lang-sql"
import {Keyword, Type} from "./sql.grammar.terms"

// ==== BEGIN CUSTOM PATCH ====
export const schemaCompletionFilter = Facet.define<typeof optionsFilter>()
async function optionsFilter(
  context: CompletionContext,
  source: ReturnType<typeof sourceContext>,
  options: Completion[]
) {
  for (let filter of context.state.facet(schemaCompletionFilter)) options = await filter(context, source, options)
  return options
}
// ==== END CUSTOM PATCH ====

function tokenBefore(tree: SyntaxNode) {
  let cursor = tree.cursor().moveTo(tree.from, -1)
  while (/Comment/.test(cursor.name)) cursor.moveTo(cursor.from, -1)
  return cursor.node
}

function idName(doc: Text, node: SyntaxNode): string {
  let text = doc.sliceString(node.from, node.to)
  let quoted = /^([`'"\[])(.*)([`'"\]])$/.exec(text)
  return quoted ? quoted[2] : text
}

function plainID(node: SyntaxNode | null) {
  return node && (node.name == "Identifier" || node.name == "QuotedIdentifier")
}

function pathFor(doc: Text, id: SyntaxNode) {
  if (id.name == "CompositeIdentifier") {
    let path = []
    for (let ch = id.firstChild; ch; ch = ch.nextSibling)
      if (plainID(ch)) path.push(idName(doc, ch))
    return path
  }
  return [idName(doc, id)]
}

function parentsFor(doc: Text, node: SyntaxNode | null) {
  for (let path = [];;) {
    if (!node || node.name != ".") return path
    let name = tokenBefore(node)
    if (!plainID(name)) return path
    path.unshift(idName(doc, name))
    node = tokenBefore(name)
  }
}

function sourceContext(state: EditorState, startPos: number) {
  let pos = syntaxTree(state).resolveInner(startPos, -1)
  let aliases = getAliases(state.doc, pos)
  if (pos.name == "Identifier" || pos.name == "QuotedIdentifier" || pos.name == "Keyword") {
    return {from: pos.from,
            quoted: pos.name == "QuotedIdentifier" ? state.doc.sliceString(pos.from, pos.from + 1) : null,
            parents: parentsFor(state.doc, tokenBefore(pos)),
            aliases}
  } if (pos.name == ".") {
    return {from: startPos, quoted: null, parents: parentsFor(state.doc, pos), aliases}
  } else {
    return {from: startPos, quoted: null, parents: [], empty: true, aliases}
  }
}

const EndFrom = new Set("where group having order union intersect except all distinct limit offset fetch for".split(" "))

function getAliases(doc: Text, at: SyntaxNode) {
  let statement
  for (let parent: SyntaxNode | null = at; !statement; parent = parent.parent) {
    if (!parent) return null
    if (parent.name == "Statement") statement = parent
  }
  let aliases = null
  for (let scan = statement.firstChild, sawFrom = false, prevID: SyntaxNode | null = null; scan; scan = scan.nextSibling) {
    let kw = scan.name == "Keyword" ? doc.sliceString(scan.from, scan.to).toLowerCase() : null
    let alias = null
    if (!sawFrom) {
      sawFrom = kw == "from"
    } else if (kw == "as" && prevID && plainID(scan.nextSibling)) {
      alias = idName(doc, scan.nextSibling!)
    } else if (kw && EndFrom.has(kw)) {
      break
    } else if (prevID && plainID(scan)) {
      alias = idName(doc, scan)
    }
    if (alias) {
      if (!aliases) aliases = Object.create(null)
      aliases[alias] = pathFor(doc, prevID!)
    }
    prevID = /Identifier$/.test(scan.name) ? scan : null
  }
  return aliases
}

function maybeQuoteCompletions(openingQuote: string, closingQuote: string, completions: readonly Completion[]) {
  return completions.map(c => ({...c, label: c.label[0] == openingQuote ? c.label : openingQuote + escapeIdentifier(c.label, closingQuote) + closingQuote, apply: undefined}))
}

const Span = /^\w*$/, QuotedSpan = /^[`'"\[]?\w*[`'"\]]?$/

function isSelfTag(namespace: SQLNamespace): namespace is {self: Completion, children: SQLNamespace} {
  return (namespace as any).self && typeof (namespace as any).self.label == "string"
}

class CompletionLevel {
  list: Completion[] = []
  children: {[name: string]: CompletionLevel} | undefined = undefined
  private _labelMap?: Map<string, number>

  constructor(readonly idQuote: string, readonly idCaseInsensitive: boolean, readonly alwaysQuote = false) {}

  child(name: string) {
    let children = this.children || (this.children = Object.create(null))
    let found = children[name]
    if (found) return found

    if (name) {
      if (!this._labelMap) {
        this._labelMap = new Map<string, number>()
        this.list.forEach((item, index) => this._labelMap!.set(item.label, index))
      }

      if (!this._labelMap.has(name)) {
        const completion = nameCompletion(name, "type", this.idQuote, this.idCaseInsensitive, this.alwaysQuote)
        this._labelMap.set(name, this.list.length)
        this.list.push(completion)
      }
    }

    return (children[name] = new CompletionLevel(this.idQuote, this.idCaseInsensitive, this.alwaysQuote))
  }

  maybeChild(name: string) {
    return this.children ? this.children[name] : null
  }

  addCompletion(option: Completion) {
    if (!this._labelMap) {
      this._labelMap = new Map<string, number>()
      this.list.forEach((item, index) => this._labelMap!.set(item.label, index))
    }

    let found = this._labelMap.get(option.label)
    if (found !== undefined) {
      this.list[found] = option
    } else {
      this._labelMap.set(option.label, this.list.length)
      this.list.push(option)
    }
  }

  addCompletions(completions: readonly (Completion | string)[]) {
    for (let option of completions)
      this.addCompletion(typeof option == "string" ? nameCompletion(option, "property", this.idQuote, this.idCaseInsensitive, this.alwaysQuote) : option)
  }

  addNamespace(namespace: SQLNamespace) {
    if (Array.isArray(namespace)) {
      this.addCompletions(namespace)
    } else if (isSelfTag(namespace)) {
      this.addNamespace(namespace.children)
    } else {
      this.addNamespaceObject(namespace as {[name: string]: SQLNamespace})
    }
  }

  addNamespaceObject(namespace: {[name: string]: SQLNamespace}) {
    performance.mark("before-addNamespace")
    this.addNamespaceObjectIterative(namespace)
    performance.mark("after-addNamespace")
    performance.measure("addNamespace", "before-addNamespace", "after-addNamespace")
  }

  private addNamespaceObjectIterative(namespace: {[name: string]: SQLNamespace}) {
    // Pre-compile patterns once
    const dotRegex = /\\?\./g
    const escapedDotRegex = /\\\./g

    // Collect all work to do in a flat structure to avoid recursion
    const workQueue: Array<{
      path: string[],
      level: CompletionLevel,
      children: SQLNamespace,
      self?: Completion
    }> = []
    let queueStart = 0

    // Initial population of work queue
    for (let name in namespace) {
      let children = namespace[name], self: Completion | undefined = undefined

      if (isSelfTag(children)) {
        self = children.self
        children = children.children
      }

      // Process path once
      let parts: string[]
      if (name.includes('.')) {
        parts = name.replace(dotRegex, p => p == "." ? "\0" : p).split("\0")
        // Clean escaped dots once
        for (let i = 0; i < parts.length; i++) {
          if (parts[i].includes('\\')) {
            parts[i] = parts[i].replace(escapedDotRegex, ".")
          }
        }
      } else {
        parts = [name]
      }

      workQueue.push({ path: parts, level: this, children, self })
    }

    // Process all work iteratively
    while (queueStart < workQueue.length) {
      const { path, level, children, self } = workQueue[queueStart++]

      // Navigate to target level
      let currentLevel = level
      for (let i = 0; i < path.length; i++) {
        if (self && i === path.length - 1) {
          currentLevel.addCompletion(self)
        }
        currentLevel = currentLevel.child(path[i])
      }

      // Add children to queue if they exist
      if (Array.isArray(children)) {
        currentLevel.addCompletions(children)
      } else if (typeof children === 'object' && children !== null) {
        // Add nested namespace to work queue instead of recursing
        for (let childName in children) {
          let childChildren = children[childName], childSelf: Completion | undefined = undefined

          if (isSelfTag(childChildren)) {
            childSelf = childChildren.self
            childChildren = childChildren.children
          }

          let childParts: string[]
          if (childName.includes('.')) {
            childParts = childName.replace(dotRegex, p => p == "." ? "\0" : p).split("\0")
            for (let i = 0; i < childParts.length; i++) {
              if (childParts[i].includes('\\')) {
                childParts[i] = childParts[i].replace(escapedDotRegex, ".")
              }
            }
          } else {
            childParts = [childName]
          }

          workQueue.push({ path: childParts, level: currentLevel, children: childChildren, self: childSelf })
        }
      }
    }
  }

}

/**
 * When identifier completions get quoted:
 * - "auto" (default): only names the dialect can't reference bare — special
 *   characters always, and MixedCase only when the dialect case-folds
 *   unquoted identifiers (`caseInsensitiveIdentifiers` unset, e.g. Postgres).
 * - "always": every completed identifier, regardless of dialect.
 */
export type IdentifierQuoting = "auto" | "always"

/**
 * Resolve the quoting parameters identifier completions use for a dialect.
 * `quoteIdentifiers: "always"` quotes every completed name unconditionally.
 * `quoteCharacter` overrides which quote gets inserted, but only when the
 * dialect recognizes that character as an identifier quote (e.g. `"` instead
 * of `[` for SQL Server) — anything else would produce SQL the database
 * rejects, so it falls back to the dialect's first quote.
 */
export function identifierCompletionParams(dialect?: SQLDialect, quoteIdentifiers?: IdentifierQuoting,
                                           quoteCharacter?: string) {
  let recognized = dialect?.spec.identifierQuotes || '"'
  let validOverride = quoteCharacter?.length == 1 && recognized.includes(quoteCharacter)
  return {
    idQuote: validOverride ? quoteCharacter : recognized[0],
    idCaseInsensitive: !!dialect?.spec.caseInsensitiveIdentifiers,
    alwaysQuote: quoteIdentifiers == "always",
  }
}

// Doubling the closing quote is the escape every supported backend uses for
// a quote character inside a quoted name: `a"b` → "a""b", a]b → [a]]b].
function escapeIdentifier(name: string, closingQuote: string) {
  return name.split(closingQuote).join(closingQuote + closingQuote)
}

export function nameCompletion(label: string, type: string, idQuote: string, idCaseInsensitive: boolean,
                               alwaysQuote = false): Completion {
  if (!alwaysQuote && (new RegExp("^[a-z_][a-z_\\d]*$", idCaseInsensitive ? "i" : "")).test(label)) return {label, type}
  let closingQuote = getClosingQuote(idQuote)
  return {label, type, apply: idQuote + escapeIdentifier(label, closingQuote) + closingQuote}
}

export function buildCompletionLevels(schema: SQLNamespace,
                                   tables?: readonly Completion[], schemas?: readonly Completion[],
                                   defaultTableName?: string, defaultSchemaName?: string,
                                   dialect?: SQLDialect, quoteIdentifiers?: IdentifierQuoting,
                                   quoteCharacter?: string) {
  let {idQuote, idCaseInsensitive, alwaysQuote} = identifierCompletionParams(dialect, quoteIdentifiers, quoteCharacter)
  let top = new CompletionLevel(idQuote, idCaseInsensitive, alwaysQuote)
  let defaultSchema = defaultSchemaName ? top.child(defaultSchemaName) : null

  top.addNamespace(schema)

  if (tables) {
    ;(defaultSchema || top).addCompletions(tables)
  }
  if (schemas) {
    top.addCompletions(schemas)
  }
  if (defaultSchema) {
    top.addCompletions(defaultSchema.list)
  }
  if (defaultTableName) {
    top.addCompletions((defaultSchema || top).child(defaultTableName).list)
  }

  return {top, defaultSchema}
}

export const setSchema = StateEffect.define<SQLNamespace>();

export const completionLevels = StateField.define<{use: boolean; top: CompletionLevel; defaultSchema: CompletionLevel | null}>({
  create() {
    return {
      ...buildCompletionLevels({}),
      use: false,
    };
  },
  update(value, tr) {
    for (let e of tr.effects) {
      if (e.is(setSchema)) {
        const config = tr.state.facet(completeConfig);
        return {
          ...buildCompletionLevels(
            e.value,
            undefined,
            undefined,
            config.defaultTableName,
            config.defaultSchemaName,
            config.dialect,
            config.quoteIdentifiers,
            config.quoteCharacter
          ),
          // HACK: Use when setSchema is triggered
          use: true,
        }
      }
    }
    return value;
  },
});

type SupportedCompleteConfig = {
  defaultTableName?: string;
  defaultSchemaName?: string;
  dialect?: SQLDialect;
  quoteIdentifiers?: IdentifierQuoting;
  quoteCharacter?: string;
}

export const completeConfig = Facet.define<
  SupportedCompleteConfig,
  SupportedCompleteConfig
>({
  combine: (values) => values.reduce((a, b) => ({ ...a, ...b }), {}),
});

function getClosingQuote(openingQuote: string) {
  return openingQuote === "[" ? "]" : openingQuote
}

// Some of this is more gnarly than it has to be because we're also
// supporting the deprecated, not-so-well-considered style of
// supplying the schema (dotted property names for schemas, separate
// `tables` and `schemas` completions).
export function completeFromSchema(schema: SQLNamespace,
                                   tables?: readonly Completion[], schemas?: readonly Completion[],
                                   defaultTableName?: string, defaultSchemaName?: string,
                                   dialect?: SQLDialect, quoteIdentifiers?: IdentifierQuoting,
                                   quoteCharacter?: string): CompletionSource {
  let {top, defaultSchema} = buildCompletionLevels(schema, tables, schemas, defaultTableName, defaultSchemaName, dialect, quoteIdentifiers, quoteCharacter)
  return async (context: CompletionContext) => {
    let {parents, from, quoted, empty, aliases} = sourceContext(context.state, context.pos)
    if (empty && !context.explicit) return null

    const {top: topState, defaultSchema: defaultSchemaState, use} = context.state.field(completionLevels)
    if (use) {
      top = topState
      defaultSchema = defaultSchemaState
    }

    if (aliases && parents.length == 1) parents = aliases[parents[0]] || parents
    let level = top
    for (let name of parents) {
      while (!level.children || !level.children[name]) {
        if (level == top && defaultSchema) level = defaultSchema
        else if (level == defaultSchema && defaultTableName) level = level.child(defaultTableName)
        else return null
      }
      let next = level.maybeChild(name)
      if (!next) return null
      level = next
    }

    let options = level.list
    if (level == top && aliases)
      options = options.concat(Object.keys(aliases).map(name => ({label: name, type: "constant"})))

    options = await optionsFilter(context, { parents, from, quoted, empty, aliases }, options);

    if (quoted) {
      let openingQuote = quoted[0]
      let closingQuote = getClosingQuote(openingQuote)

      let quoteAfter = context.state.sliceDoc(context.pos, context.pos + 1) == closingQuote

      return {
        from,
        to: quoteAfter ? context.pos + 1 : undefined,
        options: maybeQuoteCompletions(openingQuote, closingQuote, options),
        validFor: QuotedSpan
      }
    } else {
      return {
        from,
        options: options,
        validFor: Span
      }
    }
  }
}

/**
 * How completed keywords and built-in functions are cased:
 * - "preserve" (default): follow the typed prefix — a prefix containing a
 *   lowercase letter (`sel`, `Sel`) completes lowercase, an uppercase prefix
 *   (`SEL`, `GROUP_C`) or no prefix at all (explicit completion, e.g.
 *   Ctrl+Space) completes uppercase.
 * - "upper" / "lower": force one case regardless of what was typed.
 */
export type KeywordCasing = "preserve" | "upper" | "lower"

function completionType(tokenType: number) {
  return tokenType == Type ? "type" : tokenType == Keyword ? "keyword" : "variable"
}

function defaultKeyword(label: string, type: string): Completion { return {label, type, boost: -1} }

/**
 * Replaces @codemirror/lang-sql's keywordCompletionSource: casing is decided
 * per completion run (see KeywordCasing) instead of fixed at build time.
 */
export function keywordCompletionSource(dialect: SQLDialect, casing: KeywordCasing = "preserve",
                                        build?: (label: string, type: string) => Completion): CompletionSource {
  // `dialect.dialect.words` is the internal token map the upstream keyword
  // source reads. Unlike `dialect.spec`, it includes the SQL92 fallback words
  // for dialects defined without keyword lists (e.g. StandardSQL).
  const words = (dialect as unknown as {dialect: {words: {[word: string]: number}}}).dialect.words
  const make = build || defaultKeyword
  const stored = completeFromList(Object.keys(words).map(w => make(w, completionType(words[w]))))
  const upper = completeFromList(Object.keys(words).map(w => make(w.toUpperCase(), completionType(words[w]))))
  return ifNotIn(["QuotedIdentifier", "String", "LineComment", "BlockComment", "."], (context) => {
    let useUpper = casing == "upper"
    if (casing == "preserve") {
      // Uppercase unless the prefix contains a lowercase letter: only an
      // explicitly lowercase prefix asks for lowercase keywords.
      const typed = context.matchBefore(/\w+$/)
      useUpper = !typed || !/[a-z]/.test(typed.text)
    }
    return (useUpper ? upper : stored)(context)
  })
}

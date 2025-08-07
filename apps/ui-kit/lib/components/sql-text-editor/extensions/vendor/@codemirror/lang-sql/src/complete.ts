import {Completion, CompletionContext, CompletionSource} from "@codemirror/autocomplete"
import {EditorState, Facet, Text} from "@codemirror/state"
import {syntaxTree} from "@codemirror/language"
import {SyntaxNode} from "@lezer/common"
import {type SQLDialect, SQLNamespace} from "@codemirror/lang-sql"

// ==== BEGIN CUSTOM PATCH ====
export const schemaCompletionFilter = Facet.define<typeof optionsFilter>()
async function optionsFilter(
  context: CompletionContext,
  source: ReturnType<typeof sourceContext> & {
    schema: SQLNamespace;
    tables?: readonly Completion[];
    schemas?: readonly Completion[];
    defaultTableName?: string;
    defaultSchemaName?: string;
    dialect?: SQLDialect;
  },
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
  let quoted = /^([`'"])(.*)\1$/.exec(text)
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

function maybeQuoteCompletions(quote: string | null, completions: readonly Completion[]) {
  if (!quote) return completions
  return completions.map(c => ({...c, label: c.label[0] == quote ? c.label : quote + c.label + quote, apply: undefined}))
}

const Span = /^\w*$/, QuotedSpan = /^[`'"]?\w*[`'"]?$/

function isSelfTag(namespace: SQLNamespace): namespace is {self: Completion, children: SQLNamespace} {
  return (namespace as any).self && typeof (namespace as any).self.label == "string"
}

class CompletionLevel {
  list: Completion[] = []
  children: {[name: string]: CompletionLevel} | undefined = undefined

  constructor(readonly idQuote: string, readonly idCaseInsensitive: boolean) {}

  child(name: string) {
    let children = this.children || (this.children = Object.create(null))
    let found = children[name]
    if (found) return found
    if (name && !this.list.some(c => c.label == name)) this.list.push(nameCompletion(name, "type", this.idQuote, this.idCaseInsensitive))
    return (children[name] = new CompletionLevel(this.idQuote, this.idCaseInsensitive))
  }

  maybeChild(name: string) {
    return this.children ? this.children[name] : null
  }

  addCompletion(option: Completion) {
    let found = this.list.findIndex(o => o.label == option.label)
    if (found > -1) this.list[found] = option
    else this.list.push(option)
  }

  addCompletions(completions: readonly (Completion | string)[]) {
    for (let option of completions)
      this.addCompletion(typeof option == "string" ? nameCompletion(option, "property", this.idQuote, this.idCaseInsensitive) : option)
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
    for (let name of Object.keys(namespace)) {
      let children = namespace[name], self: Completion | null = null
      let parts = name.replace(/\\?\./g, p => p == "." ? "\0" : p).split("\0")
      let scope = this
      if (isSelfTag(children)) {
        self = children.self
        children = children.children
      }
      for (let i = 0; i < parts.length; i++) {
        if (self && i == parts.length - 1) scope.addCompletion(self)
        scope = scope.child(parts[i].replace(/\\\./g, "."))
      }
      scope.addNamespace(children)
    }
  }
}

function nameCompletion(label: string, type: string, idQuote: string, idCaseInsensitive: boolean): Completion {
  if ((new RegExp("^[a-z_][a-z_\\d]*$", idCaseInsensitive ? "i" : "")).test(label)) return {label, type}
  return {label, type, apply: idQuote + label + idQuote}
}

// Some of this is more gnarly than it has to be because we're also
// supporting the deprecated, not-so-well-considered style of
// supplying the schema (dotted property names for schemas, separate
// `tables` and `schemas` completions).
export function completeFromSchema(schema: SQLNamespace,
                                   tables?: readonly Completion[], schemas?: readonly Completion[],
                                   defaultTableName?: string, defaultSchemaName?: string,
                                   dialect?: SQLDialect): CompletionSource {
  let idQuote = dialect?.spec.identifierQuotes?.[0] || '"'
  let top = new CompletionLevel(idQuote, !!dialect?.spec.caseInsensitiveIdentifiers)
  let defaultSchema = defaultSchemaName ? top.child(defaultSchemaName) : null
  top.addNamespace(schema)
  if (tables) (defaultSchema || top).addCompletions(tables)
  if (schemas) top.addCompletions(schemas)
  if (defaultSchema) top.addCompletions(defaultSchema.list)
  if (defaultTableName) top.addCompletions((defaultSchema || top).child(defaultTableName).list)

  return async (context: CompletionContext) => {
    let {parents, from, quoted, empty, aliases} = sourceContext(context.state, context.pos)
    if (empty && !context.explicit) return null

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
    let quoteAfter = quoted && context.state.sliceDoc(context.pos, context.pos + 1) == quoted
    let options = level.list
    if (level == top && aliases)
      options = options.concat(Object.keys(aliases).map(name => ({label: name, type: "constant"})))

    // ==== BEGIN CUSTOM PATCH ====
    options = await optionsFilter(context, {
      parents, from, quoted, empty, aliases,
      schema, tables, schemas, defaultTableName, defaultSchemaName, dialect
    }, options);
    // ==== END CUSTOM PATCH ====

    return {
      from,
      to: quoteAfter ? context.pos + 1 : undefined,
      options: maybeQuoteCompletions(quoted, options),
      validFor: quoted ? QuotedSpan : Span
    }
  }
}

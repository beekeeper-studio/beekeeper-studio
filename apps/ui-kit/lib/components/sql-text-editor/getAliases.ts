/** Extracted from @codemirror/lang-sql -> https://github.com/codemirror/lang-sql/blob/7997522790284075e1b7c475b6699883e85ab71c/src/complete.ts */

import { Text } from "@codemirror/state";
import { SyntaxNode } from "@lezer/common";

function idName(doc: Text, node: SyntaxNode): string {
  let text = doc.sliceString(node.from, node.to);
  let quoted = /^([`'"])(.*)\1$/.exec(text);
  return quoted ? quoted[2] : text;
}

function plainID(node: SyntaxNode | null) {
  return node && (node.name == "Identifier" || node.name == "QuotedIdentifier");
}

function pathFor(doc: Text, id: SyntaxNode) {
  if (id.name == "CompositeIdentifier") {
    let path = [];
    for (let ch = id.firstChild; ch; ch = ch.nextSibling)
      if (plainID(ch)) path.push(idName(doc, ch));
    return path;
  }
  return [idName(doc, id)];
}

const EndFrom = new Set(
  "where group having order union intersect except all distinct limit offset fetch for".split(
    " "
  )
);

export default function getAliases(doc: Text, at: SyntaxNode) {
  let statement: SyntaxNode;
  for (let parent: SyntaxNode | null = at; !statement; parent = parent.parent) {
    if (!parent) return null;
    if (parent.name == "Statement") statement = parent;
  }

  let aliases = null;
  for (
    let scan = statement.firstChild,
      sawFrom = false,
      prevID: SyntaxNode | null = null;
    scan;
    scan = scan.nextSibling
  ) {
    let kw =
      scan.name == "Keyword"
        ? doc.sliceString(scan.from, scan.to).toLowerCase()
        : null;
    let alias = null;
    if (!sawFrom) {
      sawFrom = kw == "from";
    } else if (kw == "as" && prevID && plainID(scan.nextSibling)) {
      alias = idName(doc, scan.nextSibling!);
    } else if (kw && EndFrom.has(kw)) {
      break;
    } else if (prevID && plainID(scan)) {
      alias = idName(doc, scan);
    }
    if (alias) {
      if (!aliases) aliases = Object.create(null);
      aliases[alias] = pathFor(doc, prevID!);
    }
    prevID = /Identifier$/.test(scan.name) ? scan : null;
  }
  return aliases;
}

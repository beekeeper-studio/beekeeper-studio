import { TableKey } from "@/shared/lib/dialects/models";
import _ from "lodash";
import rawLog from "@bksLogger";
import globals from '@/common/globals'
import { LineGutter } from "../editor/utils";
import { toRegexSafe } from "@/common/utils";
import { Decoration, EditorView, WidgetType } from "@codemirror/view";

export interface UpdateOptions {
  dataId: number | string;
  value: Record<string, unknown>;
  expandablePaths: string[];
  signs: Record<string, LineGutter["type"]>;
  editablePaths: string[];
}

const log = rawLog.scope("jsonViewer");


export interface ExpandablePath {
  path: string[];
  tableKey: TableKey;
}

/**
 * Find a line position of a key in a JSON string.
 *
 * We expect the string to be a result of `JSON.stringify(obj, null, 2)`
 **/
export function findKeyPosition(jsonStr: string, path: (string | number)[]) {
  let lines = jsonStr.split("\n");
  let lineSearchOffset = 0;

  for (let pathIdx = 0; pathIdx < path.length; pathIdx++) {
    const targetKey = path[pathIdx];
    let found = false;

    for (let i = lineSearchOffset; i < lines.length; i++) {
      const keyMatch = new RegExp(`^\\s{${(pathIdx + 1) * 2}}"${targetKey}":`);

      if (keyMatch.test(lines[i])) {
        lineSearchOffset = i + 1;
        found = true;

        if (pathIdx === path.length - 1) {
          return i;
        }

        break;
      }
    }

    if (!found) {
      break;
    }
  }

  return -1;
}

function createExpandableElement(text: string) {
  const element = document.createElement("a");
  element.classList.add("expandable-value");
  element.innerText = text;

  const icon = document.createElement("i");
  icon.classList.add("material-icons");
  icon.innerText = "keyboard_arrow_down";

  element.appendChild(icon);

  return element;
}

// FIXME this works with string values only
function createTruncatableElement(text: string) {
  const element = document.createElement("a");
  element.classList.add("truncatable-value", "bks-tooltip-wrapper");
  element.innerText = text.slice(0, -1);

  const more = document.createElement("span");
  more.classList.add("more");
  more.innerText ="Show more";

  element.appendChild(more);
  element.appendChild(document.createTextNode('"'))

  return element;
}

export function findValueInfo(line: string) {
  const matches = line.match(/(^\s*".*":\s*)(.*?),?\s*$/);
  if (!matches) return null;

  const from = matches[1].length;
  const to = from + matches[2].length;
  const value = line.slice(from, to);

  return { from, to, value };
}

/** Remove all properties that don't contain the given filter */
export function deepFilterObjectProps(
  obj: Record<string, any>,
  filter: string,
  paths?: string[]
) {
  const regex = toRegexSafe(filter);

  if (!paths) paths = getPaths(obj);
  const filteredPaths = paths.filter((path) =>
    regex ? regex.test(path) : path.toLowerCase().includes(filter)
  );
  return _.pick(obj, filteredPaths);
}

/**
 * Get all possible paths of an object excluding arrays.
 *
 * For example:
 * ```js
 * const obj = { a: { b: 0 }, c: [1, 2] }
 * console.log(getPaths(obj)) // ["a.b", "c"]
 * ```
 **/
export function getPaths(obj: Record<string, any>) {
  const keys = [];
  eachPaths(obj, (path) => keys.push(path));
  return keys;
}

type Value = string | boolean | number | null;

/**
 * Recursively iterate through the object paths that has primitive values or
 * array
 **/
export function eachPaths(
  obj: Record<string, any>,
  fn: (path: string, value: Value | Value[]) => void,
  currentPath = ''
) {
  const keys = Object.keys(obj);
  for (const key of keys) {
    const newPath = currentPath ? `${currentPath}.${key}` : key;
    const value = obj[key];

    if (_.isObject(obj[key]) && !_.isArray(obj[key]) && value !== null) {
      // Recurse if the value is an object
      eachPaths(value, fn, newPath);
    } else {
      // Apply the callback function on the current path and value
      fn(newPath, value);
    }
  }
}

/** Mutate the row data to replace JSON columns with parsed JSON objects */
export function parseRowDataForJsonViewer(data: Record<string, any>, tableColumns: { field: string, dataType: string }[]) {
  tableColumns.forEach(column => {
    const columnValue = data[column.field]

    // Check if the column is a JSON column
    let isJsonColumn = String(column.dataType).toUpperCase() === 'JSON' || String(column.dataType).toUpperCase() === 'JSONB'

    // If the column is not a JSON column, check if it is a JSON string
    if (!isJsonColumn) {
      const isColumnHasStringAndNotEmpty = typeof columnValue === 'string' && columnValue.trim() !== ''

      if (isColumnHasStringAndNotEmpty) {
        const trimmedValue = columnValue.trim()
        const isJsonObjectString = trimmedValue.startsWith('{') && trimmedValue.endsWith('}')
        const isJsonArrayString = trimmedValue.startsWith('[') && trimmedValue.endsWith(']')

        if (isJsonObjectString || isJsonArrayString) {
          isJsonColumn = true
        }
      }
    }

    if (isJsonColumn) {
      try {
        if (_.isString(data[column.field])) {
          data[column.field] = JSON.parse(data[column.field])
        }
      } catch (e) {
        log.warn(`Failed to parse JSON for column ${column.field}:`, e)
      }
    }
  })
  return data
}

export function createTruncatableTextDecoration(
  text: string,
  onClick: () => void
): Decoration {
  return Decoration.replace({
    widget: new TruncatableTextWidget(text, onClick),
  });
}

class TruncatableTextWidget extends WidgetType {
  constructor(
    private readonly text: string,
    private readonly onClick: () => void
  ) {
    super();
  }

  toDOM(): HTMLElement {
    const element = createTruncatableElement(this.text);
    element.addEventListener("click", this.onClick);
    return element;
  }

  destroy(dom: HTMLElement) {
    dom.removeEventListener('click', this.onClick);
  }
}

export function createExpandableTextDecoration(
  text: string,
  onClick: () => void
): Decoration {
  return Decoration.replace({
    widget: new ExpandableTextWidget(text, onClick),
  });
}

class ExpandableTextWidget extends WidgetType {
  constructor(
    private readonly text: string,
    private readonly onClick: () => void
  ) {
    super();
  }

  toDOM(): HTMLElement {
    const element = createExpandableElement(this.text);
    element.addEventListener("click", this.onClick);
    return element;
  }

  destroy(dom: HTMLElement) {
    dom.removeEventListener('click', this.onClick);
  }
}

import { TableKey } from "@/shared/lib/dialects/models";
import _ from "lodash";
import globals from '@/common/globals'

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

export function createExpandableElement(text: string) {
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
export function createTruncatableElement(text: string) {
  const element = document.createElement("a");
  element.classList.add("truncatable-value", "bks-tooltip-wrapper");
  element.innerText = text.slice(0, -1);

  const more = document.createElement("span");
  more.classList.add("more");
  more.innerText = "...";

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
  if (!paths) paths = getPaths(obj);
  const filteredPaths = paths.filter((path) =>
    path.toLowerCase().includes(filter)
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

import { TableKey } from "@/shared/lib/dialects/models";
import _ from "lodash";

export interface ExpandablePath {
  path: string[];
  tableKey: TableKey;
}

/**
 * Find a line position of a key in a JSON string.
 *
 * We expect the string to be a result of `JSON.stringify(obj, null, 2)`
 **/
export function findKeyPosition(jsonStr: string, path: string[]) {
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

export function createExpandBtn() {
  const expandBtn = document.createElement("button");
  const icon = document.createElement("i");
  icon.classList.add("material-icons");
  icon.innerText = "unfold_more";
  expandBtn.appendChild(icon);
  expandBtn.classList.add("btn", "btn-flat", "btn-fab", "expand-btn");
  return expandBtn;
}

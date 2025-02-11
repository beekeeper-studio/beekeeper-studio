import { TabulatorFull } from "tabulator-tables";

export function extendTabulator(
  func: (tabulatorClass: typeof TabulatorFull) => void
): void {
  func(TabulatorFull);
}

export function getTabulatorClass(): typeof TabulatorFull {
  return TabulatorFull;
}

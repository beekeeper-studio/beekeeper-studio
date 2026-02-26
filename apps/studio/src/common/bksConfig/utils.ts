import { isTaggedString } from "@/config/tags";
import { KeybindingValue } from "@/types";

export function isKeybindingValue(value: unknown): value is KeybindingValue {
  return typeof value === "string" || isTaggedString(value);
}

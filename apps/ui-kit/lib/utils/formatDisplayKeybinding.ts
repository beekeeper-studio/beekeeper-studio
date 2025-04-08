import { isMacLike } from "./platform";

// @doc https://www.w3.org/TR/uievents-key/#keys-modifier
const MOD_KEYS = [
  "Alt",
  "AltGraph",
  "CapsLock",
  "Control",
  "Fn",
  "FnLock",
  "Meta",
  "NumLock",
  "ScrollLock",
  "Shift",
  "Symbol",
  "SymbolLock",
];

const NORMAL_MAC_KEYS = {
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  Backspace: "⌦",
};

const NORMAL_KEYS = {
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
};

export function formatDisplayKeybinding(str: string | string[]) {
  const keys = Array.isArray(str) ? str : str.split("+").map((key) => key.trim());
  const modKeys = keys.filter((key) => MOD_KEYS.includes(key));
  const normalKey = keys.find((key) => !MOD_KEYS.includes(key));

  if (isMacLike) {
    let combination = "";

    if (modKeys.includes("Meta")) {
      combination += "^";
    }
    if (modKeys.includes("Alt")) {
      combination += "⌥";
    }
    if (modKeys.includes("Shift")) {
      combination += "⇧";
    }
    if (modKeys.includes("Control")) {
      combination += "⌘";
    }
    if (modKeys.includes("Symbol")) {
      combination += "☺";
    }

    combination += NORMAL_MAC_KEYS[normalKey] || normalKey;

    return combination;
  }

  const combination = [];

  if (modKeys.includes("Control")) {
    combination.push("Ctrl");
  }
  if (modKeys.includes("Alt")) {
    combination.push("Alt");
  }
  if (modKeys.includes("Meta")) {
    combination.push("Meta");
  }
  if (modKeys.includes("Shift")) {
    combination.push("Shift");
  }
  if (modKeys.includes("Symbol")) {
    combination.push("Symbol");
  }

  combination.push(NORMAL_KEYS[normalKey] || normalKey);

  return combination.join("+");
}

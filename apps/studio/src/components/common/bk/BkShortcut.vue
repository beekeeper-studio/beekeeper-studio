<template>
  <span
    class="bk-shortcut"
    v-bind="$attrs"
  >{{ display }}</span>
</template>

<script lang="ts">
import Vue from "vue";

// https://www.w3.org/TR/uievents-key/#keys-modifier
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

const isAppleDevice =
  navigator.platform.startsWith("Mac") ||
  ["iPhone", "iPad"].includes(navigator.platform);

export default Vue.extend({
  name: "BkShortcut",
  inheritAttrs: false,
  props: {
    value: {
      type: String,
      default: "",
    },
  },
  computed: {
    keys(): string[] {
      if (!this.value) return [];
      let parts = this.value.replace("++", "+PLUS").split("+");
      parts = parts
        .map(($0) => $0.trim().replace("PLUS", "+"))
        .filter(($0) => $0 !== "");
      return parts;
    },
    modKeys(): string[] {
      return this.keys.filter((key) => MOD_KEYS.includes(key));
    },
    normalKey(): string | null {
      const key = this.keys.find((k) => MOD_KEYS.includes(k) === false);
      return key === undefined ? null : key;
    },
    display(): string {
      const modKeys = this.modKeys;
      const normalKey = this.normalKey;
      let displayValue = "";

      if (isAppleDevice) {
        if (modKeys.includes("Meta")) displayValue += "^";
        if (modKeys.includes("Alt")) displayValue += "⌥";
        if (modKeys.includes("Shift")) displayValue += "⇧";
        if (modKeys.includes("Control")) displayValue += "⌘";
        if (modKeys.includes("Symbol")) displayValue += "☺";

        const mappings: Record<string, string> = {
          ArrowUp: "↑",
          ArrowDown: "↓",
          ArrowLeft: "←",
          ArrowRight: "→",
          Backspace: "⌦",
        };

        if (normalKey !== null) {
          displayValue += mappings[normalKey] || normalKey;
        }
      } else {
        const parts: string[] = [];

        if (modKeys.includes("Control")) parts.push("Ctrl");
        if (modKeys.includes("Alt")) parts.push("Alt");
        if (modKeys.includes("Meta")) parts.push("Meta");
        if (modKeys.includes("Shift")) parts.push("Shift");
        if (modKeys.includes("Symbol")) parts.push("Symbol");

        const mappings: Record<string, string> = {
          ArrowUp: "Up",
          ArrowDown: "Down",
          ArrowLeft: "Left",
          ArrowRight: "Right",
        };

        if (normalKey !== null) {
          parts.push(mappings[normalKey] || normalKey);
        }

        displayValue = parts.join("+");
      }

      return displayValue;
    },
  },
});
</script>

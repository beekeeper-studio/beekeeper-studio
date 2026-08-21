import { keymapTypes } from "@/lib/db/types"

// These values are handed straight to the ui-kit text editor, which validates
// them against its own `Keymap` union. Adding one here without adding it in
// apps/ui-kit/lib/components/text-editor/types.ts leaves the option visible in
// the cog menu but silently inert, so pin the set.
describe("keymapTypes", () => {
  test("matches the keymaps the ui-kit editor accepts", () => {
    expect(keymapTypes.map((k) => k.value)).toEqual([
      "default",
      "vim",
      "minimal-emacs",
    ])
  })

  test("has a label for every value", () => {
    for (const keymap of keymapTypes) {
      expect(keymap.name).toBeTruthy()
    }
  })
})

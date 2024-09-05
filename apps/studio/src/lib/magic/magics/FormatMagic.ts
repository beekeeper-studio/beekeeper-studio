import { Magic } from "../Magic";
import { MagicColumn } from "../MagicColumn";
import format_magics from "./format_magics";


const FormatMagic: Magic = {
  name: "Format",
  initializers: ['format'],
  render: function (): MagicColumn | null {
    // name, format, [magic] <- that's 3 parts.
    console.warn("render called on format magic by mistake?")
    return null
  },
  subMagics: format_magics
}

export default FormatMagic

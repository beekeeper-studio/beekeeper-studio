import { Magic } from "../../Magic";
import { MagicColumn } from "../../MagicColumn";



const CheckMagic: Magic = {
  name: "CheckMagic",
  initializers: ['check', 'tick'],
  render: function (args: string[]): MagicColumn {
    return {
      title: args[0],
      formatter: 'tickCross'
    }
  }
}

export default CheckMagic
import BksProgress from "@shared/lib/tabulator/formatters/BksProgress";
import { Magic } from "../../Magic";
import { MagicColumn } from "../../MagicColumn";
import _ from "lodash";



const ProgressMagic: Magic = {
  name: "ProgressMagic",
  initializers: ['progress', 'loading'],
  render: function (args: string[]): MagicColumn {
    return {
      title: args[0],
      formatter: BksProgress,
      formatterParams: args[3] ? {
        max: _.toNumber(args[3])
      } : undefined
    }
  }
}

export default ProgressMagic

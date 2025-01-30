import { Magic } from "../../Magic";
import { MagicColumn } from "../../MagicColumn";
import _ from "lodash";


const StarsMagic: Magic = {
  name: "StarsMagic",
  initializers: ['stars', 'rating', 'estrellas'],
  render: function (args: string[]): MagicColumn {
    // [colname, format, stars, x]
    return {
      title: args[0],
      formatter: 'star',
      formatterParams: args[3] ? {
        stars: _.toNumber(args[3])
      } : undefined
    }
  }
}

export default StarsMagic

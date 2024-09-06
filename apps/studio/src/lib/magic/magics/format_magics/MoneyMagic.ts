import { Magic } from "../../Magic";
import { MagicColumn } from "../../MagicColumn";
import { CellComponent } from "tabulator-tables";
import CurrencyCodes from "@shared/lib/CurrencyCodes";

const MoneyMagic: Magic = {
  name: "MoneyMagic",
  initializers: ['money', 'currency', 'dinero'],
  autocompleteHints: CurrencyCodes.map((cc) => cc.cc.toLowerCase()),
  render: function (args: string[]): MagicColumn {
    const locale = window.platformInfo.locale
    const currency = args[3]?.toUpperCase() || 'USD'
    const result = {
      title: args[0],
      formatter: (cell: CellComponent) => {
        const format = new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
        if (!isNaN(_.toNumber(cell.getValue()))) {
          return format.format(cell.getValue())
        } else {
          return 'NaN'
        }
      }
    }
    return result
  }
}

export default MoneyMagic

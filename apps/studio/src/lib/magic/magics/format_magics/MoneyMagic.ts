import { Magic } from "../../Magic";
import { MagicColumn } from "../../MagicColumn";
import { CellComponent } from "tabulator-tables";
import CurrencyCodes from "@shared/lib/CurrencyCodes";
import _ from "lodash";

const MoneyMagic: Magic = {
  name: "MoneyMagic",
  initializers: ['money', 'currency', 'dinero'],
  autocompleteHints: CurrencyCodes.map((cc) => cc.cc.toLowerCase()),
  render: function (args: string[]): MagicColumn {
    // defaulting applocale to US (sorry friends, but that's where I am). Maybe add it to the ini file at some point?
    // https://www.electronjs.org/docs/latest/api/app#appgetlocale mentions the getLocale must be called after the ready event so maybe something here?
    const locale = window.platformInfo.locale || 'en-US'
    const currency = args[3]?.toUpperCase() || 'USD'
    const result = {
      title: args[0],
      formatter: (cell: CellComponent) => {
        const format = new Intl.NumberFormat(locale, {
          style: 'currency',
          currency,
          currencyDisplay: 'narrowSymbol'
        })
        try {
          return format.format(cell.getValue())
        } catch {
          return 'NaN'
        }
      }
    }
    return result
  }
}

export default MoneyMagic

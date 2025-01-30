import { Magic } from "../../Magic";
import { MagicColumn } from "../../MagicColumn";
import { linkParams } from "./LinkMagic";



const EmailMagic: Magic = {
  name: "EmailMagic",
  initializers: ['email'],
  render: function (args: string[]): MagicColumn {
    return {
      title: args[0],
      formatter: 'link',
      formatterParams: {
        urlPrefix: 'mailto:',
        ...linkParams
      },
      cssClass: 'magic-link'
    }
  }
}

export default EmailMagic
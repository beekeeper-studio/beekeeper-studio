import { Magic } from "../../Magic";
import { MagicColumn } from "../../MagicColumn";



const ImageMagic: Magic = {
  name: "ImageMagic",
  initializers: ['img', 'image', 'imagen'],
  render: function (args: string[]): MagicColumn {
    let params = {
      height: '100%',
      width: undefined
    }
    let cssClass = 'static-image'
    if (args[3]) {
      const [x, y] = args[3].split("x")
      if (x || y) {
        params = {
          width: x ? `${x}px` : undefined, height: y ? `${y}px` : undefined
        }
        cssClass = 'magic-image'
      }
    }
    return {
      title: args[0],
      formatter: 'image',
      formatterParams: params,
      cssClass,
    }
  }
}


export default ImageMagic
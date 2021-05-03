import { expose } from "threads/worker"

// interface ExportOptions {
//   foo: string,
//   joe: string,
//   bloggs: boolean
// }

expose({
  export(config) {
    console.log('exporting! Using ', config);
    return true
  }
})
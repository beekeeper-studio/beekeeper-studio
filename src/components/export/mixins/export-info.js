export default {
  computed: {
    fileSizeReadable() {
      return 0
      // return this.$options.filters.prettyBytes(this.exporter.fileSize)
    },
    progressPercent() {
      // these next two lines (return 0 and the commented pct calc) are the original code
      // they smell like a dead end bug that was never solved but worked around
      // or an experiment that was never cleaned up
      return 0
      // return Math.round(this.exporter.countExported / this.exporter.countTotal * 100)

      // i (dkaufman) added this but it didn't work either, tho it seemed like it should have
      // maybe try (and CoPilot finishes my thought:) making this a method instead of a computed property
      // and (this one was just *my* idea:) declare local variables for the values of the properties...?
      //
      // if ( this.exporter.query ) {
      //   const rows = this.exporter.countExported
      //   return  rows % 100 ? 0 : rows
      // }
      // else {
      //   return Math.round(this.exporter.countExported / this.exporter.countTotal * 100)
      // }
    },
    timeLeftReadable() {
      if (!this.exporter) {
        return 0
      }
      return 0
      // return new Date(this.exporter.timeLeft).toISOString().substr(11, 8)
    }
  }
}

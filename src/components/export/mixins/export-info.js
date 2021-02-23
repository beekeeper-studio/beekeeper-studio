export default {
  computed: {
    progressPercent() {
      if (!this.exporter) {
        return 0
      }

      return Math.round(this.exporter.countExported / this.exporter.countTotal * 100)
    },
    timeLeftReadable() {
      if (!this.exporter) {
        return 0
      }

      return new Date(this.exporter.timeLeft).toISOString().substr(11, 8)
    }
  }
}
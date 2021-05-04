<template>
  <div></div>
</template>
<script>
import Noty from "noty";
import { ExportProgress } from '../../lib/export/models'

export default {
  props: ['exporter', 'key'],
  data() {
    return {
      percentComplete: 0,
      notification: new Noty({
        text: `Exporting '${this.exporter.tableName}'`,
        layout: "bottomRight",
        timeout: false,
        closeWith: ['button'],
        buttons: [
          Noty.button("Cancel", "btn btn-danger", this.cancelExport.bind(this)),
          Noty.button("Hide", "btn btn-info", () => this.notification.close()),
        ],
        queue: "export",
      }),
    }
  },
  computed: {
    notificationText() {
      return `(${this.percentComplete}%) Exporting '${this.exporter.tableName}'`
    },
  },
  methods: {
    cancelExport() {
      this.$emit('cancel', this.key)
      this.notification.close();
    },
    updateProgress(progress) {
      this.percentComplete = progress.percentComplete
    }
  },
  watch: {
    notificationText: {
      handler() {
        if (this.notification) {
          this.notification.setText(this.notificationText);
        }
      },
    },
  },
  mounted() {
    this.notification.show();
  },
  beforeDestroy() {
    this.exporter.offProgress(this.updateProgress)
    this.notification.close();
  },
};
</script>

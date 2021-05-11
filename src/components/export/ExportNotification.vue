<template>
  <div></div>
</template>
<script>
import Noty from "noty";
import ExportInfo from "./mixins/export-info";
import { Export } from '../../lib/export';

export default {
  mixins: [ExportInfo],
  props: ['exporter'],
  data() {
    return {
      percentComplete: 0,
      notification: new Noty({
        text: `Exporting '${this.exporter.table.name}'`,
        layout: "bottomRight",
        timeout: false,
        closeWith: 'button',
        buttons: [
          Noty.button("Cancel", "btn btn-flat", this.cancelExport.bind(this)),
          Noty.button("Hide", "btn btn-primary", () => this.notification.close()),
        ],
        queue: "export",
      }),
    }
  },
  computed: {
    notificationText() {
      return `(${this.percentComplete}%) Exporting '${this.exporter.table.name}'`
    },
  },
  methods: {
    cancelExport() {
      if (!this.exporter) {
        return;
      }
      this.exporter.abort();
      this.notification.close();
      this.$noty.error(`${this.exporter.table.name} export aborted`);
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
    this.exporter.onProgress(this.updateProgress)
    this.notification.show();
  },
  beforeDestroy() {
    this.exporter.offProgress(this.updateProgress)
    this.notification.close();
  },
};
</script>

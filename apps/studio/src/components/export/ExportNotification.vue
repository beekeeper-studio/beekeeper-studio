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
    const exportName = this.exporter.table ? this.exporter.table.name : 'query';
    return {
      percentComplete: 0,
      notification: new Noty({
        text: `Exporting '${exportName}'`,
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
      const exportName = this.exporter.table ? this.exporter.table.name : 'query';
      // this is a hack to get the countExported to update <-- CoPilot suggested this comment, and it was right af lol
      const countExported = this.countExported;
      const percentComplete = this.percentComplete;
      return this.exporter.table ? `(${percentComplete}%) Exporting TABLE '${exportName}'` : `(${countExported} rows) Exporting QUERY '${exportName}'`
    },
  },
  methods: {
    cancelExport() {
      if (!this.exporter) {
        return;
      }
      this.exporter.abort();
      this.notification.close();
      const exportName = this.exporter.table ? this.exporter.table.name : 'query';
      this.$noty.error(`${exportName} export aborted`);
    },
    updateProgress(progress) {
      // not quite sure why this hackiness (and only this hackiness) finally made it work but i'll take it
      this.countExported = progress.countExported
      this.percentComplete = this.exporter.table ? progress.percentComplete : progress.countExported
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

<template>
  <div />
</template>
<script>
import Noty from "noty";
import ExportInfo from "./mixins/export-info";
import { ExportStatus } from '../../lib/export/models'

export default {
  mixins: [ExportInfo],
  props: ['exporter', 'exportId'],
  data() {
    // TODO (@day): this should be queried from the process based on the id that's received in the prop
    return {
      percentComplete: 0,
      exportName: null,
      notification: new Noty({
        // NOTE (@day): not sure this actually works lol
        text: `Exporting '${this.exportName}'`,
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
      // CoPilot suggested the comment below, and it was right af lol
      // this is a hack to get the countExported to update
      const countExported = this.countExported;
      const percentComplete = this.percentComplete;
      return percentComplete
        ? `(${percentComplete}%) Exporting table '${this.exportName}'`
        : `(${countExported} rows) Exporting query '${this.exportName}'`
    },
  },
  methods: {
    async cancelExport() {
      if (!this.exportId) {
        return;
      }
      await this.$util.send('export/cancel', { id: this.exportId });
      this.notification.close();
      const exportName = await this.$util.send('export/name', { id: this.exportId });
      this.$noty.error(`${exportName} export aborted`);
    },
    async updateExportName() {
      this.exportName = await this.$util.send('export/name', { id: this.exportId });
    },
    async updateProgress(progress) {
      // not quite sure why this hackiness (and only this hackiness) finally made it work but i'll take it
      this.countExported = progress.countExported
      this.percentComplete = progress.percentComplete ? progress.percentComplete : progress.countExported
    }
  },
  watch: {
    notificationText: {
      handler() {
        if (this.notification) {
          this.notification?.setText(this.notificationText);
        }
      },
    },
  },
  async mounted() {
    const status = await this.$util.send('export/status', { id: this.exportId });
    this.exportName = await this.$util.send('export/name', { id: this.exportId });
    if (status === ExportStatus.Exporting) {
      this.$util.addListener(`onExportProgress/${this.exportId}`, this.updateProgress.bind(this));
      this.notification.show();
    }
  },
  beforeDestroy() {
    this.$util.removeListener(`onExportProgress/${this.exportId}`);
    this.notification.close();
  },
};
</script>

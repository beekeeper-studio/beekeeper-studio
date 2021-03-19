<template>
  <span></span>
</template>
<script>
import Noty from "noty";
import ExportInfo from "./mixins/export-info";

export default {
  mixins: [ExportInfo],
  props: {
    exporter: {
      required: true,
    },
  },
  data() {
    return {
      notification: new Noty({
        text: "Exporting...",
        layout: "bottomRight",
        timeout: false,
        closeWith: "button",
        buttons: [
          Noty.button("Abort", "btn btn-danger", () => this.cancelExport()),
          Noty.button("Hide", "btn btn-flat", () => this.exporter.hide()),
        ],
        queue: "export",
      }),
    };
  },
  computed: {
    notificationText() {
      return `
            <div class="export-progress-notification">
                <div class="title">Exporting from <span class="text-primary">${this.exporter.table.name}</span></div>
                <div class="flex flex-between progress-info">
                    <div>${this.timeLeftReadable}</div>
                    <div>${this.exporter.countExported} / ${this.exporter.countTotal} rows</div>
                    <div>${this.fileSizeReadable}</div>
                </div>
                <x-progressbar class="progress-bar" value="${this.progressPercent}" max="100"></x-progressbar>
            </div>
            `;
    },
  },
  methods: {
    cancelExport() {
      if (!this.exporter) {
        return;
      }
      this.exporter.abort();
      this.notification.close();
      this.$noty.error("Export aborted");
    },
  },
  watch: {
    exporter: {
      deep: true,
      handler() {
        if (this.notification) {
          this.notification.setText(this.notificationText);
        }
      },
    },
  },
  mounted() {
    this.notification.show();
    this.notification.setText(this.notificationText);
  },
  beforeDestroy() {
    this.notification.close();
  },
};
</script>

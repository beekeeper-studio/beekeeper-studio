<template>
  <div class="list-item export-list-item">
    <a
      class="list-item-btn"
      @click.prevent="select()"
      :class="{ active: false }"
    >
      <i
        v-if="exporter.status === Export.Status.Exporting"
        class="item-icon text-primary material-icons"
        >file_download</i
      >
      <i
        v-if="exporter.status === Export.Status.Completed"
        class="item-icon text-success material-icons"
        >check</i
      >
      <i
        v-if="exporter.status === Export.Status.Aborted"
        class="item-icon text-danger material-icons"
        >close</i
      >
      <i
        v-if="exporter.status === Export.Status.Error"
        class="item-icon text-danger material-icons"
        >error</i
      >
      <div class="list-title flex-col">
        <span
          class="item-text title truncate expand"
          :title="exporter.fileName"
        >
          Select * From {{ exporter.table.name }}
        </span>
        <span
          v-if="exporter.status === Export.Status.Exporting"
          class="database subtitle"
        >
          <x-progressbar
            class="progress-bar"
            :value="progressPercent"
            max="100"
          ></x-progressbar>
          <div class="flex flex-between progress-info">
            <span>{{ timeLeftReadable }}</span>
            <span
              >{{ exporter.countExported }} / {{ exporter.countTotal }}</span
            >
            <span>{{ $options.filters.prettyBytes(exporter.fileSize) }}</span>
          </div>
        </span>
        <span
          v-else-if="exporter.status === Export.Status.Error"
          class="database subtitle"
        >
          <span class="text-danger" :title="exporter.error.message">{{
            exporter.error.message
          }}</span>
        </span>
        <span v-else class="database subtitle">
          <div class="flex flex-between progress-info">
            <span>{{ exporter.countExported }} records</span>
            <span>{{ $options.filters.prettyBytes(exporter.fileSize) }}</span>
          </div>
        </span>
      </div>
      <x-contextmenu>
        <x-menu style="--target-align: right; --v-target-align: top">
          <x-menuitem
            v-if="exporter.status === Export.Status.Completed"
            @click="exporter.openFile()"
          >
            <x-label>Open File</x-label>
          </x-menuitem>
          <x-menuitem
            v-if="exporter.status === Export.Status.Exporting"
            @click="exporter.abort()"
          >
            <x-label class="text-danger">Abort</x-label>
          </x-menuitem>
          <x-menuitem
            v-if="hasIncompleteStatus"
            @click="exporter.exportToFile()"
          >
            <x-label>Retry</x-label>
          </x-menuitem>
          <x-menuitem
            v-if="exporter.status !== Export.Status.Exporting"
            @click="removeExport(exporter.id)"
          >
            <x-label>Clear</x-label>
          </x-menuitem>
          <hr />
          <x-menuitem @click="removeInactive()">
            <x-label>Clear All</x-label>
          </x-menuitem>
        </x-menu>
      </x-contextmenu>
    </a>
  </div>
</template>

<script>
import Noty from "noty";
import { Export } from "@/lib/export/export";
import ExportInfo from "@/components/export/mixins/export-info";
import { mapMutations } from "vuex";

export default {
  mixins: [ExportInfo],
  props: {
    exporter: {
      required: true,
    },
  },
  data() {
    return {
      Export: Export,
    };
  },
  computed: {
    hasIncompleteStatus() {
      return (
        this.exporter.status === Export.Status.Aborted ||
        this.exporter.status === Export.Status.Error
      );
    },
  },
  methods: {
    ...mapMutations({
      removeExport: "exports/removeExport",
      removeInactive: "exports/removeInactive",
    }),
    select() {
      console.log("export selected");
    },
  },
  watch: {
    exporter: {
      deep: true,
      handler() {
        if (this.exporter.status === Export.Status.Completed) {
          new Noty({
            type: "success",
            text:
              "Data successfully exported to: <br /><br /><code>" +
              this.exporter.fileName +
              "</code>",
            layout: "bottomRight",
            timeout: 3000,
            closeWith: "button",
            buttons: [
              Noty.button("Open", "btn btn-success", () =>
                this.exporter.openFile()
              ),
            ],
            queue: "export",
          }).show();
        } else if (this.exporter.status === Export.Status.Error) {
          this.$noty.error(
            "Error while exporting: <br /><br /><code>" +
              this.exporter.error.message +
              "</code>"
          );
        }
      },
    },
  },
};
</script>
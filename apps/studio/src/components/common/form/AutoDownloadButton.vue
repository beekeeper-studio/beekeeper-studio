<template>
  <div class="auto-download-button" v-if="visible">
    <!-- License acceptance modal -->
    <driver-dep-license-modal
      :modal-id="licenseModalId"
      :dep-name="providerInfo ? providerInfo.requirementId : requirementId"
      :version="providerInfo ? providerInfo.version : ''"
      :license-name="providerInfo ? providerInfo.licenseName : ''"
      :license-url="providerInfo ? providerInfo.licenseUrl : ''"
      :documentation-url="providerInfo ? providerInfo.documentationUrl : ''"
      :download-url="artifactUrl"
      :install-path="installPath"
      :notes="platformNotes"
    />

    <!-- Idle: show download button -->
    <template v-if="!installing">
      <button
        class="btn btn-flat auto-download-btn"
        type="button"
        :disabled="!providerAvailable || loading"
        title="Download and install automatically"
        @click.prevent="startFlow"
      >
        <i class="material-icons">cloud_download</i>
        <span>Auto-download</span>
      </button>
    </template>

    <!-- Installing: show small spinner/label (noty has the real progress) -->
    <template v-else>
      <span class="download-in-progress">
        <i class="material-icons spin">sync</i>
        <span>Downloading...</span>
      </span>
    </template>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import Noty from "noty";
import DriverDepLicenseModal, {
  DRIVER_DEP_LICENSE_EVENT,
  DriverDepLicenseEventData,
} from "@/components/common/modals/DriverDepLicenseModal.vue";

export default Vue.extend({
  components: { DriverDepLicenseModal },
  props: {
    requirementId: { type: String, required: true },
    settingKey: { type: String, required: true },
  },
  data() {
    return {
      loading: false,
      providerAvailable: false,
      providerInfo: null as any,
      installing: false,
      progressListenerId: null as string | null,
      notification: null as any,
    };
  },
  computed: {
    licenseModalId(): string {
      return `driver-dep-license-${this.requirementId}`;
    },
    visible(): boolean {
      if (this.installing) return true;
      return this.providerAvailable;
    },
    artifactUrl(): string {
      if (!this.providerInfo) return '';
      const platform = window.platformInfo?.platform;
      const artifact = this.providerInfo.artifacts?.find(
        (a: any) => a.platform === platform
      );
      return artifact?.url || '';
    },
    installPath(): string {
      const dir = window.platformInfo?.driverDepsDirectory;
      if (!dir) return '';
      return `${dir}/${this.requirementId}`;
    },
    platformNotes(): string[] {
      const notes = this.providerInfo?.notes;
      if (!Array.isArray(notes)) return [];
      const platform = window.platformInfo?.platform;
      return notes
        .filter((n: any) => !n.platforms || n.platforms.includes(platform))
        .map((n: any) => n.text);
    },
  },
  watch: {
    requirementId: {
      immediate: true,
      handler() {
        this.loadStatus();
      },
    },
  },
  mounted() {
    this.registerHandlers([
      { event: DRIVER_DEP_LICENSE_EVENT, handler: this.onModalClose },
    ]);
  },
  beforeDestroy() {
    this.unregisterHandlers([
      { event: DRIVER_DEP_LICENSE_EVENT, handler: this.onModalClose },
    ]);
    this.cleanupProgress();
  },
  methods: {
    async loadStatus() {
      this.loading = true;
      try {
        const status = await this.$util.send("driverDep/status", {
          requirementId: this.requirementId,
        });
        this.providerAvailable = status.providerAvailable;
      } catch {
        // Driver dep system not ready
      } finally {
        this.loading = false;
      }
    },
    async startFlow() {
      try {
        this.providerInfo = await this.$util.send("driverDep/providerInfo", {
          requirementId: this.requirementId,
        });
        if (!this.providerInfo) return;
        this.$modal.show(this.licenseModalId);
      } catch {
        this.$noty.error("Failed to load download info");
      }
    },
    async onModalClose(event: DriverDepLicenseEventData) {
      if (event.modalId !== this.licenseModalId) return;
      if (!event.accepted) return;
      await this.doInstall();
    },
    async doInstall() {
      this.installing = true;

      // Set up progress listener
      this.progressListenerId = this.$util.addListener(
        `onDriverDepProgress/${this.requirementId}`,
        this.onProgress.bind(this)
      );

      // Show progress noty
      this.notification = new Noty({
        text: "Downloading...",
        layout: "bottomRight",
        timeout: false,
        closeWith: [],
        queue: "driverDep",
      });
      this.notification.show();

      try {
        await this.$util.send("driverDep/install", {
          requirementId: this.requirementId,
        });

        this.cleanupProgress();
        if (this.providerInfo?.restartRequired) {
          this.$noty.success("Download complete. Restart Beekeeper Studio to use this driver.");
        } else {
          this.$noty.success("Download complete.");
        }

        // Emit installed BEFORE refreshing settings — the store update
        // triggers a re-render that destroys this component (parent
        // switches to filled card), so the event must fire first.
        this.$emit("installed", { restartRequired: this.providerInfo?.restartRequired });
        await this.$store.dispatch("settings/initializeSettings");
      } catch (e) {
        this.cleanupProgress();
        const docUrl = this.providerInfo?.documentationUrl || '';
        const manualHint = docUrl ? ` <a href="${docUrl}" target="_blank">Manual download</a>` : '';
        this.$noty.error(`Download failed.${manualHint}`);
      } finally {
        this.installing = false;
      }
    },
    onProgress(progress: any) {
      if (!this.notification) return;
      const phase = progress.phase;
      const pct = progress.percentage;

      let text = "Downloading...";
      if (phase === "downloading" && pct != null) {
        text = `Downloading... ${pct}%`;
      } else if (phase === "extracting") {
        text = "Extracting...";
      } else if (phase === "installing") {
        text = "Installing...";
      }

      this.notification.setText(text);
    },
    cleanupProgress() {
      if (this.progressListenerId) {
        this.$util.removeListener(this.progressListenerId);
        this.progressListenerId = null;
      }
      if (this.notification) {
        this.notification.close();
        this.notification = null;
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.auto-download-button {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

.auto-download-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  white-space: nowrap;

  .material-icons {
    font-size: 18px;
  }
}

.download-in-progress {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.85rem;
  opacity: 0.7;
  padding: 0 0.5rem;

  .material-icons {
    font-size: 18px;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spin {
  animation: spin 1.5s linear infinite;
}
</style>

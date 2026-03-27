<template>
  <portal to="modals">
    <modal
      class="vue-dialog beekeeper-modal driver-dep-license-modal"
      :name="modalId"
      @before-close="beforeClose"
    >
      <div v-kbd-trap="true">
        <div class="dialog-content">
          <div class="dialog-c-title">
            Download {{ depName }}
          </div>
          <div class="driver-dep-license-body">
            <p>
              Beekeeper Studio will download
              <strong>{{ depName }}</strong>
              <template v-if="version"> v{{ version }}</template>
              and install it for use as a database driver dependency.
            </p>

            <div class="driver-dep-details-panel">
              <div v-if="downloadUrl" class="detail-row">
                <span class="detail-label">Source</span>
                <code class="detail-url">{{ downloadUrl }}</code>
              </div>
              <div v-if="installPath" class="detail-row">
                <span class="detail-label">Install to</span>
                <code class="detail-url">{{ installPath }}</code>
              </div>
            </div>

            <div
              v-for="(note, idx) in notes"
              :key="idx"
              class="driver-dep-notes"
            >
              <i class="material-icons-outlined">info</i>
              <span>{{ note }}</span>
            </div>

            <p class="license-notice">
              By proceeding you agree to the
              <a :href="licenseUrl" @click.prevent="openExternal(licenseUrl)">{{ licenseName }}</a>.
            </p>

            <p v-if="documentationUrl" class="doc-link">
              <a :href="documentationUrl" @click.prevent="openExternal(documentationUrl)">
                Official documentation &amp; manual download
              </a>
            </p>
          </div>
        </div>
        <div class="vue-dialog-buttons">
          <button
            class="btn btn-flat"
            type="button"
            @click.prevent="cancel"
          >
            Cancel
          </button>
          <button
            class="btn btn-primary"
            type="button"
            @click.prevent="accept"
          >
            Accept &amp; Download
          </button>
        </div>
      </div>
    </modal>
  </portal>
</template>

<script lang="ts">
import Vue from "vue";

export const DRIVER_DEP_LICENSE_EVENT = "driver-dep-license-close";

export interface DriverDepLicenseEventData {
  modalId: string;
  accepted: boolean;
}

export default Vue.extend({
  props: {
    modalId: { type: String, required: true },
    depName: { type: String, default: "" },
    version: { type: String, default: "" },
    licenseName: { type: String, default: "" },
    licenseUrl: { type: String, default: "" },
    documentationUrl: { type: String, default: "" },
    downloadUrl: { type: String, default: "" },
    installPath: { type: String, default: "" },
    notes: { type: Array, default: () => [] },
  },
  methods: {
    beforeClose(e: { params?: boolean }) {
      const data: DriverDepLicenseEventData = {
        modalId: this.modalId,
        accepted: e.params ?? false,
      };
      this.$root.$emit(DRIVER_DEP_LICENSE_EVENT, data);
    },
    accept() {
      this.$modal.hide(this.modalId, true);
    },
    cancel() {
      this.$modal.hide(this.modalId, false);
    },
    openExternal(url: string) {
      this.$native.openLink(url);
    },
  },
});
</script>

<style lang="scss">
.driver-dep-license-modal {
  .driver-dep-license-body {
    margin-top: 0.5rem;

    a {
      color: var(--bks-link-color, #2196f3);
      text-decoration: underline;
      cursor: pointer;

      &:hover {
        opacity: 0.8;
      }
    }

    .driver-dep-details-panel {
      margin: 0.75rem 0;
      padding: 0.6rem 0.75rem;
      border: 1px solid var(--bks-border-color, rgba(255, 255, 255, 0.08));
      border-radius: 6px;
      background: var(--bks-query-editor-bg, rgba(0, 0, 0, 0.15));

      .detail-row {
        display: flex;
        gap: 0.5rem;
        padding: 0.25rem 0;

        &:not(:last-child) {
          border-bottom: 1px solid var(--bks-border-color, rgba(255, 255, 255, 0.05));
          padding-bottom: 0.4rem;
          margin-bottom: 0.15rem;
        }
      }

      .detail-label {
        flex-shrink: 0;
        font-size: 0.8rem;
        opacity: 0.55;
        min-width: 55px;
      }

      .detail-url {
        font-size: 0.78rem;
        word-break: break-all;
        opacity: 0.85;
      }
    }

    .driver-dep-notes {
      display: flex;
      gap: 0.5rem;
      align-items: flex-start;
      margin: 0.75rem 0;
      padding: 0.5rem 0.65rem;
      border-radius: 6px;
      background: rgba(var(--bks-brand-warning-rgb, 255, 193, 7), 0.08);
      border: 1px solid rgba(var(--bks-brand-warning-rgb, 255, 193, 7), 0.2);
      font-size: 0.82rem;
      line-height: 1.4;
      opacity: 0.9;

      .material-icons-outlined {
        font-size: 16px;
        flex-shrink: 0;
        margin-top: 1px;
        color: var(--bks-brand-warning, #ffc107);
      }
    }

    .license-notice {
      margin-top: 0.75rem;
    }

    .doc-link {
      margin-top: 0.25rem;
      font-size: 0.85rem;
    }
  }
}
</style>

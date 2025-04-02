<template>
  <portal to="modals">
    <modal class="vue-dialog beekeeper-modal" :name="modalName">
      <div class="dialog-content">
        <div class="dialog-c-title">
          <i class="material-icons alert-warning">warning</i>
          Configuration Warnings
        </div>
        <div class="alert config-modal-warnings">
          <template v-if="'unrecognized-key' in groupedWarnings">
            <span>Unrecognized keys</span>
            <ul>
              <li
                v-for="warning in groupedWarnings['unrecognized-key']"
                :key="`${warning.sourceName}-${warning.path}-${warning.section}`"
              >
                <template v-if="warning.section === warning.path">
                  <span style="font-weight: bold">[{{ warning.section }}]</span>
                </template>
                <template v-else>
                  <span style="font-weight: bold">{{ warning.path }}</span> at
                  <span style="font-weight: bold">[{{ warning.section }}]</span>
                </template>
                in {{ warning.sourceName }} config.
              </li>
            </ul>
          </template>
          <template v-if="'system-user-conflict' in groupedWarnings">
            <span>
              System settings can't be overridden. The following keys are
              ignored:
            </span>
            <ul>
              <li
                v-for="warning in groupedWarnings['system-user-conflict']"
                :key="`${warning.sourceName}-${warning.path}-${warning.section}`"
              >
                <span style="font-weight: bold">{{ warning.path }}</span> at
                <span style="font-weight: bold">[{{ warning.section }}]</span>
              </li>
            </ul>
          </template>
        </div>
      </div>
      <div class="vue-dialog-buttons">
        <button
          class="btn btn-flat"
          type="button"
          @click.prevent="$modal.hide(modalName)"
          autofocus
        >
          Close
        </button>
      </div>
    </modal>
  </portal>
</template>

<style lang="scss" scoped>
.config-modal-warnings {
  display: flex;
  flex-direction: column;
}
</style>

<script lang="ts">
import Vue from "vue";
import _ from "lodash";

export default Vue.extend({
  data() {
    return {
      modalName: "configuration-modal",
    };
  },
  computed: {
    groupedWarnings() {
      return _.groupBy(this.$bksConfig.warnings, "type");
    },
  },
  async mounted() {
    if (this.$bksConfig.warnings.length > 0) {
      await this.$nextTick();
      this.$modal.show(this.modalName);
    }
  },
});
</script>

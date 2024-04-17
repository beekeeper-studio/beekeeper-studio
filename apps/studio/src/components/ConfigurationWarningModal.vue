<template>
  <portal to="modals">
    <modal class="vue-dialog beekeeper-modal" :name="modalName">
      <div class="dialog-content">
        <div class="dialog-c-title">
          Found {{ $bkConfig.warnings.length }} invalid configuration{{
            $bkConfig.warnings.length > 1 ? "s" : ""
          }}
        </div>
        <div class="alert alert-warning config-modal-warnings">
          <div
            v-for="(warning, idx) in $bkConfig.warnings"
            :key="`${idx}-${warning.type}-${warning.section}-${warning.key}`"
          >
            <template v-if="warning.type === 'section'">
              <span>Unexpected section
                <span style="font-weight: bold">[{{ warning.section }}]</span></span>
            </template>
            <template v-else-if="warning.type === 'key'">
              <span>
                Unexpected key
                <span style="font-weight: bold">{{ warning.key }}</span> at section
                <span style="font-weight: bold">[{{ warning.section }}]</span>
              </span>
            </template>
          </div>
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

export default Vue.extend({
  data() {
    return {
      modalName: "configuration-modal",
    };
  },
  async mounted() {
    if (this.$bkConfig.warnings.length > 0) {
      await this.$nextTick();
      this.$modal.show(this.modalName);
    }
  },
});
</script>

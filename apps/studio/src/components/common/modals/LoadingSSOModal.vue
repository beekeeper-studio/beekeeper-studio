<template>
  <portal to="modals">
    <modal class="vue-dialog beekeeper-modal wait-sso-modal" :name="modalName" :click-to-close="false">
      <div v-kbd-trap="true">
        <div class="dialog-content">
          <div class="dialog-c-title">
            Waiting for authentication
            <loading-spinner />
          </div>
        </div>
        <div class="vue-dialog-buttons">
          <button
            class="btn btn-flat btn-cancel"
            type="button"
            ref="cancelBtn"
            @click.prevent="cancel"
            :disabled="canceled"
          >
            Cancel
          </button>
        </div>
      </div>
    </modal>
  </portal>
</template>

<script lang="ts">
import Vue from "vue";
import LoadingSpinner from '@/components/common/loading/LoadingSpinner.vue';

export default Vue.extend({
  components: {LoadingSpinner},
  props: ["value"],
  data() {
    return {
      modalName: "sso-loading-modal",
      canceled: false,
    };
  },
  watch: {
    async value() {
      if (this.value) {
        this.canceled = false;
        this.$modal.show(this.modalName);
        // Somehow the refs are only available if we combine nextTick and
        // setTimeout like this ¯\_(ツ)_/¯
        await this.$nextTick()
        setTimeout(() => this.$refs.cancelBtn.focus(), 0)
      } else {
        this.$modal.hide(this.modalName);
      }
    },
  },
  methods: {
    cancel() {
      this.canceled = true;
      this.$emit('cancel');
    },
  },
  beforeDestroy() {
    this.$modal.hide(this.modalName);
  }
});
</script>

<template>
  <common-modal :id="modalName" :click-to-close="false">
    <template v-slot:title>
      Waiting for authentication
      <loading-spinner />
    </template>
    <template v-slot:action>
      <button
        class="btn btn-flat btn-cancel"
        type="button"
        ref="cancelBtn"
        @click.prevent="cancel"
        :disabled="canceled"
      >
        Cancel
      </button>
    </template>
  </common-modal>
</template>

<script lang="ts">
import Vue from "vue";
import LoadingSpinner from '@/components/common/loading/LoadingSpinner.vue';
import CommonModal from '@/components/common/modals/CommonModal.vue'

export default Vue.extend({
  components: { LoadingSpinner, CommonModal },
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
  mounted() {
    this.$nextTick(() => {
      this.$modal.show(this.modalName)
    })
  }
});
</script>

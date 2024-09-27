<template>
  <portal to="modals">
    <modal class="vue-dialog beekeeper-modal" :name="modalName" @before-close="beforeClose">
      <div class="dialog-content">
        <div class="dialog-c-title">Start Your Ultimate Edition Trial?</div>
        <div>
          You’re about to unlock the full features of the Ultimate Edition! Would you like to start a free trial and experience everything we offer? Or, you can continue using the Community Edition with access to free features only.
        </div>
      </div>
      <div class="vue-dialog-buttons">
        <button class="btn btn-flat" type="button" @click.prevent="startFreeTrial">
          Start Free Trial
        </button>
        <button class="btn btn-flat" type="button" @click.prevent="close">
          Continue with Community Edition
        </button>
      </div>
    </modal>
  </portal>
</template>

<script lang="ts">
export default {
  computed: {
    modalName: () => "trial-begin-modal",
  },
  methods: {
    beforeClose() {
      this.$store.dispatch('toggleShowBeginTrialModal', false)
    },
    close() {
      this.$modal.hide(this.modalName);
    },
    startFreeTrial() {
      this.close();
    },
  },
  async mounted() {
    if (!this.$store.getters.showBeginTrialModal) return;
    await this.$nextTick();
    this.$modal.show(this.modalName);
  },
};
</script>

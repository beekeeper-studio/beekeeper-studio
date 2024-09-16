<template>
  <portal to="modals">
    <modal class="vue-dialog beekeeper-modal" :name="modalName" @before-close="beforeClose">
      <div class="dialog-content">
        <div class="dialog-c-title">[TRIAL MODAL]</div>
        <div>
          [TRIAL STARTS. Lorem ipsum dolor sit amet, consectetur adipiscing
          elit, sed do eiusmod tempor incididunt ut labore et dolore magna
          aliqua.]
        </div>
      </div>
      <div class="vue-dialog-buttons">
        <button class="btn btn-flat" type="button" @click.prevent="close">
          Close
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
      this.$util.send('appdb/setting/set', { key: 'openBeginTrialModal', value: false });
    },
    close() {
      this.$modal.hide(this.modalName);
    },
    async isOpeningModalAllowed() {
      const openBeginTrialModal = await this.$util.send('appdb/setting/get', { key: 'openBeginTrialModal' });
      return openBeginTrialModal.value
    },
  },
  async mounted() {
    if (!await this.isOpeningModalAllowed()) return;
    await this.$nextTick();
    this.$modal.show(this.modalName);
  },
};
</script>

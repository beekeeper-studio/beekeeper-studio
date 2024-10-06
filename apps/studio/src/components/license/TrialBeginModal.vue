<template>
  <portal to="modals">
    <modal class="vue-dialog beekeeper-modal" :name="modalName" @before-close="beforeClose">
      <div class="dialog-content">
        <div class="dialog-c-title">Welcome to Beekeeper Studio</div>
        <div>
          <p>Let's get started. You can use Beekeeper Studio's <strong>Ultimate Edition</strong> features free for {{ trialPeriod }} days.</p>
        </div>
      </div>
      <div class="vue-dialog-buttons">
        <a class="small text-muted" type="button" @click.prevent="enterLicense">
          Enter license
        </a>
        <span class="expand"></span>
        <button class="btn btn-flat" type="button" @click.prevent="startFreeTrial">
          Start Trial
        </button>
      </div>
    </modal>
  </portal>
</template>

<script lang="js">
import { AppEvent } from '@/common/AppEvent';
import globals from '@/common/globals';

export default {
  data: () => ({
    trialPeriod: globals.freeTrialDays
  }),
  computed: {
    modalName: () => "trial-begin-modal",
  },
  methods: {
    beforeClose() {
      this.$store.dispatch('toggleShowBeginTrialModal', false)
    },
    enterLicense() {
      this.close()
      this.$root.$emit(AppEvent.enterLicense)
    },
    close() {
      this.$modal.hide(this.modalName);
    },
    startFreeTrial() {
      this.$store.dispatch('licenses/add', { trial: true })
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

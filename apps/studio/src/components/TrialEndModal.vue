<template>
  <portal to="modals">
    <modal class="vue-dialog beekeeper-modal" :name="modalName">
      <div class="dialog-content">
        <div class="dialog-c-title">[YOUR TRIAL ENDED]</div>
        <div>
          [TRIAL ENDS. Lorem ipsum dolor sit amet, consectetur adipiscing
          elit, sed do eiusmod tempor incididunt ut labore et dolore magna
          aliqua.]
        </div>
      </div>
      <div class="vue-dialog-buttons">
        <button class="btn btn-flat" type="button" @click.prevent="downgrade">
          Downgrade to limited free edition
        </button>
        <a
          ref="learnMore"
          href="https://docs.beekeeperstudio.io/docs/upgrading-from-the-community-edition"
          class="btn btn-flat"
        >Learn more</a>
        <button class="btn btn-flat" type="button" @click.prevent="purchase">
          Purchase a license
        </button>
      </div>
    </modal>
  </portal>
</template>

<script lang="ts">
import { mapGetters } from 'vuex'
import { AppEvent } from "@/common/AppEvent"

export default {
  computed: {
    modalName: () => "trial-end-modal",
    ...mapGetters({
      'isTrial': 'licenses/isTrial',
    }),
  },
  watch: {
    async isTrial() {
      const openEndLicenseModal = await this.$util.send('appdb/setting/get', { key: 'openEndLicenseModal' });
      if (!this.isTrial && openEndLicenseModal.value) {
        this.$modal.show(this.modalName);
      }
    },
  },
  methods: {
    downgrade() {
      this.$util.send('appdb/setting/set', { key: 'openEndLicenseModal', value: false });
      this.$modal.hide(this.modalName);
    },
    purchase() {
      this.downgrade()
      this.$root.$emit(AppEvent.enterLicense)
    },
  },
};
</script>

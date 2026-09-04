<template>
  <div v-if="false" />
</template>
<script lang="ts">
import Vue from 'vue'
import Noty from 'noty'
import { mapGetters, mapActions, mapState } from 'vuex'
import logoUrl from '@/assets/logo.svg'

export default Vue.extend({
  data: () => {
    return {
      onboardingNoty: null as Noty | null,
    }
  },
  computed: {
    ...mapGetters(['onboardingNotyShown', 'connected']),
    ...mapState(['connected']),
  },
  watch: {
    connected() {
      if (this.connected && !this.onboardingNotyShown) {
        this.setOnboardingNotyShown()
      }
      this.onboardingNoty?.close();
    },
  },
  methods: {
    ...mapActions(['setOnboardingNotyShown']),
    async notifyOnboarding() {
      Noty.closeAll('onboarding');

      if (this.onboardingNotyShown) {
        return;
      }

      // First time user will get a demo query tab (cheese query), so if the
      // tabCount is more than 1, then the user has used the app before.
      const tabCount = await this.$util.send("appdb/tabs/count", {
        withDeleted: true,
      });

      if (tabCount > 1) {
        this.setOnboardingNotyShown();
        return;
      }

      const n = new Noty({
        text: `<div class="noty-onboarding-title">
                <img class="noty-onboarding-logo" src="${logoUrl}">
                Welcome to Beekeeper Studio!
              </div>
              <div class="noty-onboarding-body">
                Double click the demo database to explore app features
                or read the <a class="link" href="https://docs.beekeeperstudio.io/getting-started-guide/">getting started guide</a>.
              </div>`,
        closeWith: ['button'],
        layout: 'bottomRight',
        timeout: false,
        queue: 'onboarding',
        buttons: [
          Noty.button("Don't show again", 'btn btn-flat', () => {
            this.setOnboardingNotyShown()
            n.close();
          }),
        ],
      });
      n.show();
      this.onboardingNoty = n;
    },
  },
  beforeDestroy() {
    this.onboardingNoty?.close();
  },
  mounted() {
    this.notifyOnboarding()
  }
})
</script>

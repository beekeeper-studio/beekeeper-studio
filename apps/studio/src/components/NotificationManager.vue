<template>
  <div v-if="false" />
</template>
<script lang="ts">
import Vue from 'vue'
import Noty from 'noty'
import { mapGetters, mapActions, mapState } from 'vuex'

export default Vue.extend({
  data: () => {
    return {
      notificationInterval: null,
      timeoutID: null,
      isShowingOnboardingNoty: false,
      upsellNotificationOptions: {
        text: "👋 Beekeeper Studio is run by a small team. Buy the full version of Beekeeper Studio to support development and get more features. Thank you ♥",
        timeout: 1000 * 60 * 5,
        queue: "upsell",
        killer: 'upsell',
        layout: 'bottomRight',
        closeWith: ['button'],
        buttons: [
          Noty.button('Close', 'btn btn-flat', () => Noty.closeAll('upsell')),
          Noty.button('Get Started', 'btn btn-primary', () => window.main.openExternally('https://docs.beekeeperstudio.io/docs/upgrading-from-the-community-edition'))
        ]
      },
      onboardingNoty: null as Noty | null,
    }
  },
  computed: {
    ...mapGetters({
      'isCommunity': 'isCommunity',
    }),
    ...mapGetters(['onboardingNotyShown', 'connected']),
    ...mapState(['connected']),
  },
  watch: {
    isCommunity() {
      this.initNotifyInterval()
    },
    connected() {
      if (this.connected && !this.onboardingNotyShown) {
        this.setOnboardingNotyShown()
      }
      this.noty?.close();
    },
  },
  methods: {
    ...mapActions(['setOnboardingNotyShown']),
    initNotifyInterval() {
      const intervalTime = 1000 * 60 * 60 * 3
      if (this.notificationInterval) {
        clearInterval(this.notificationInterval)
        this.notificationInterval = null
      }
      if (this.timeoutID) {
        clearTimeout(this.timeoutID)
        this.timeoutID = null
      }
      if (!this.isCommunity) { 
        return
      }

      this.notificationInterval = setInterval(() => {
        this.notifyUpsell()
      }, intervalTime)

      this.timeoutID = setTimeout(() => {
        this.notifyUpsell()
      }, 1000 * 60 * 5)
    },
    notifyUpsell() {
      if (!this.isShowingOnboardingNoty) {
        new Noty(this.upsellNotificationOptions).show()
      }
    },
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
        text: `<div class="noty-gs-title">
                <img class="noty-gs-logo" src="/src/assets/logo.svg">
                Welcome to Beekeeper Studio!
              </div>
              <div class="noty-gs-body">
                Double click the demo database to explore app features,
                <a class="link" href="https://docs.beekeeperstudio.io">watch our 60s quickstart video</a>,
                or <a class="link" href="https://docs.beekeeperstudio.io">read our getting started guide</a>.
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
        callbacks: {
          beforeShow: () => {
            this.isShowingOnboardingNoty = true
          },
          afterClose: () => {
            this.isShowingOnboardingNoty = false
            this.onboardingNoty = null
          }
        },
      });
      n.show();
      this.noty = n;
    },
  },
  mounted() {
    this.initNotifyInterval()
    this.notifyOnboarding()
  }
})
</script>

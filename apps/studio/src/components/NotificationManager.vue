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
      notificationInterval: null,
      timeoutID: null,
      isShowingOnboardingNoty: false,
      upsellNotificationOptions: {
        text: `<div class="bks-upgrade-noty">
                <div class="bks-upgrade-noty-head">
                  <div class="bks-upgrade-noty-glyph"><i class="material-icons">workspace_premium</i></div>
                  <h2>Do more with Beekeeper Studio</h2>
                </div>
                <p class="bks-upgrade-noty-body">Upgrade to unlock the full toolkit — built for people who live in their database all day.</p>
                <div class="bks-upgrade-noty-chips">
                  <span class="bks-upgrade-noty-chip"><i class="material-icons c-json">data_object</i>JSON row viewer</span>
                  <span class="bks-upgrade-noty-chip"><i class="material-icons c-ai">auto_awesome</i>AI Shell</span>
                  <span class="bks-upgrade-noty-chip"><i class="material-icons c-nosql">hub</i>NoSQL support</span>
                  <span class="bks-upgrade-noty-chip">+ more</span>
                </div>
                <div class="bks-upgrade-noty-lifetime">
                  <i class="material-icons">all_inclusive</i>
                  <span><strong>Lifetime usage license</strong> — included with every purchase.</span>
                </div>
              </div>`,
        timeout: 1000 * 60 * 5,
        queue: "upsell",
        killer: 'upsell',
        layout: 'bottomRight',
        closeWith: ['button'],
        buttons: [
          Noty.button('Not now', 'btn btn-flat', () => Noty.closeAll('upsell')),
          Noty.button('Upgrade', 'btn btn-brand', () => window.main.openExternally('https://beekeeperstudio.io/pricing/'))
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
        killer: 'upsell',
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

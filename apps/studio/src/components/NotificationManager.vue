<template>
  <div v-if="false" />
</template>
<script lang="ts">
import Vue from 'vue'
import Noty from 'noty'
import { mapGetters, mapActions, mapState } from 'vuex'
import { AppEvent } from '@/common/AppEvent'
import logoUrl from '@/assets/logo.svg'

export default Vue.extend({
  data() {
    return {
      notificationInterval: null,
      timeoutID: null,
      isShowingOnboardingNoty: false,
      isShowingUpgradeModal: false,
      upsellNoty: null as Noty | null,
      onboardingNoty: null as Noty | null,
    }
  },
  computed: {
    ...mapGetters({
      'isCommunity': 'isCommunity',
    }),
    ...mapGetters(['onboardingNotyShown', 'connected']),
    ...mapState(['connected']),
    ...mapState('tabs', { activeTab: 'active' }),
    isOnAiUpsellTab(): boolean {
      // Community user is sitting on the AI Shell upgrade prompt — don't
      // pile a noty on top of the in-tab pitch.
      const tab = this.activeTab as any
      return this.isCommunity
        && tab?.type === 'plugin'
        && tab?.context?.pluginId === 'bks-ai-shell'
    },
  },
  watch: {
    isCommunity() {
      this.initNotifyInterval()
    },
    connected() {
      if (this.connected && !this.onboardingNotyShown) {
        this.setOnboardingNotyShown()
      }
      this.upsellNoty?.close();
    },
  },
  methods: {
    ...mapActions(['setOnboardingNotyShown']),
    buildUpsellOptions() {
      const text = `<strong>Unlock the full Beekeeper Studio.</strong> Cloud workspaces, SQL AI Shell, ER Diagrams, JSON viewer, and more — every purchase includes a <strong>lifetime usage license</strong>.`
      return {
        text,
        timeout: 1000 * 60 * 5,
        queue: "upsell",
        killer: 'upsell',
        layout: 'bottomRight',
        closeWith: ['button'],
        buttons: [
          Noty.button('Dismiss', 'btn btn-flat', () => Noty.closeAll('upsell')),
          Noty.button('Learn more', 'btn btn-primary', () => {
            Noty.closeAll('upsell')
            this.$root.$emit(AppEvent.upgradeModal)
          })
        ]
      }
    },
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
      if (this.isShowingOnboardingNoty) return
      if (this.isShowingUpgradeModal) return
      if (this.isOnAiUpsellTab) return
      this.upsellNoty = new Noty(this.buildUpsellOptions())
      this.upsellNoty.show()
    },
    onUpgradeModalOpened() {
      this.isShowingUpgradeModal = true
      Noty.closeAll('upsell')
    },
    onUpgradeModalClosed() {
      this.isShowingUpgradeModal = false
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
      this.onboardingNoty = n;
    },
  },
  mounted() {
    this.initNotifyInterval()
    this.notifyOnboarding()
    this.$root.$on('upgradeModalOpened', this.onUpgradeModalOpened)
    this.$root.$on('upgradeModalClosed', this.onUpgradeModalClosed)
  },
  beforeDestroy() {
    this.$root.$off('upgradeModalOpened', this.onUpgradeModalOpened)
    this.$root.$off('upgradeModalClosed', this.onUpgradeModalClosed)
  }
})
</script>

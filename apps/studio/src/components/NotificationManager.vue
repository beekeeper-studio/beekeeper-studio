<template>
  <div v-if="false" />
</template>
<script lang="ts">
import Vue from 'vue'
import Noty from 'noty'
import { mapGetters, mapActions, mapState } from 'vuex'
import logoUrl from '@/assets/logo.svg'
import { AppEvent } from '@/common/AppEvent'
import { PRICING_URL } from '@/lib/purchaseRequest'
import { escapeHtml } from '@shared/lib/tabulator'

export default Vue.extend({
  data: () => {
    return {
      notificationInterval: null,
      timeoutID: null,
      isShowingOnboardingNoty: false,
      onboardingNoty: null as Noty | null,
    }
  },
  computed: {
    ...mapGetters({
      'isCommunity': 'isCommunity',
    }),
    ...mapGetters(['onboardingNotyShown', 'connected']),
    ...mapGetters('licenses', ['noLicensesFound', 'trialLicense']),
    ...mapGetters('paidFeatureUsage', ['usedFeatures']),
    ...mapState(['connected']),
    // The periodic community nudge. Before a trial it offers the trial (one
    // click, nothing to enter). After one, it talks about the user's own
    // trial and points at the two ways to buy.
    upsellNotificationOptions() {
      const base = {
        timeout: 1000 * 60 * 5,
        queue: 'upsell',
        killer: 'upsell',
        layout: 'bottomRight',
        closeWith: ['button'],
      }
      const close = () => Noty.closeAll('upsell')

      if (this.noLicensesFound) {
        return {
          ...base,
          text: 'Try every paid feature free for 14 days. No email or card, and the app reverts to the free version on its own.',
          buttons: [
            Noty.button('Not now', 'btn btn-flat', close),
            Noty.button('Start free trial', 'btn btn-primary', () => {
              close()
              this.$store.dispatch('licenses/add', { trial: true })
            }),
          ],
        }
      }

      const used = this.usedFeatures.slice(0, 3).map((f) => escapeHtml(f.displayLabel))
      const text = used.length
        ? `Used during your trial and now locked: <strong>${used.join(', ')}</strong>. Paying for 12 months includes lifetime access to the versions released in that period.`
        : 'Paid features are locked. Paying for 12 months includes lifetime access to the versions released in that period.'

      return {
        ...base,
        text,
        buttons: [
          Noty.button('Close', 'btn btn-flat', close),
          Noty.button('Ask your team', 'btn btn-flat', () => {
            close()
            this.$root.$emit(AppEvent.purchaseRequest)
          }),
          Noty.button('Pricing', 'btn btn-primary', () => {
            close()
            this.$native.openLink(PRICING_URL)
          }),
        ],
      }
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

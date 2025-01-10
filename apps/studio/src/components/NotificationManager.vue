<template>
  <div v-if="false" />
</template>
<script lang="ts">
import { SmartLocalStorage } from '@/common/LocalStorage'
import Vue from 'vue'
import Noty from 'noty'

export default Vue.extend({
  data: () => {
    return {
      upsellNotification: new Noty({
        text: "👋 Beekeeper Studio is run by a small team. Buy the full version of Beekeeper Studio to support development and get more features. Thank you ♥",
        timeout: false,
        queue: "upsell",
        killer: 'upsell',
        layout: 'bottomRight',
        closeWith: ['button'],
        buttons: [
          Noty.button('Close', 'btn btn-flat', () => Noty.closeAll('upsell')),
          Noty.button('Get Started', 'btn btn-primary', () => window.main.openExternally('https://docs.beekeeperstudio.io/docs/upgrading-from-the-community-edition'))
        ]
      })
    }
  },
  mounted() {
    if (this.$store.getters.isCommunity) {
      const today = new Date()
      const upgradeSuggested = SmartLocalStorage.getDate('ultimate-upsell')
      const lastWeek = new Date(today.getTime() - (28 * 24 * 60 * 60 * 1000))
      if (!upgradeSuggested || upgradeSuggested < lastWeek) {
        setTimeout(() => {
          this.upsellNotification.show()
          SmartLocalStorage.setDate('ultimate-upsell', today)
        }, (1000 * 60 * 5)) // 5 minutes
      }
    }
  }
})
</script>

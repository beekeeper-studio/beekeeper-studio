<template>
  <div v-if="false" />
</template>
<script lang="ts">
import Vue from 'vue'
import Noty from 'noty'

export default Vue.extend({
  data: () => {
    return {
      upsellNotificationOptions: {
        text: "👋 Beekeeper Studio is run by a small team. Buy the full version of Beekeeper Studio to support development and get more features. Thank you ♥",
        timeout: 10000,
        queue: "upsell",
        killer: 'upsell',
        layout: 'bottomRight',
        closeWith: ['button'],
        buttons: [
          Noty.button('Close', 'btn btn-flat', () => Noty.closeAll('upsell')),
          Noty.button('Get Started', 'btn btn-primary', () => window.main.openExternally('https://docs.beekeeperstudio.io/docs/upgrading-from-the-community-edition'))
        ]
      }
    }
  },
  mounted() {
    const intervalTime = 1000 * 60 * 5
    if (this.$store.getters.isCommunity) {
      setInterval(() => {
        new Noty(this.upsellNotificationOptions).show()
      }, intervalTime)
    }
  }
})
</script>

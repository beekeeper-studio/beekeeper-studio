<template>
  <div v-if="false" />
</template>
<script lang="ts">
import Vue from 'vue'
import Noty from 'noty'
import { mapGetters } from 'vuex'

export default Vue.extend({
  data: () => {
    return {
      notificationInterval: null,
      timeoutID: null,
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
      }
    }
  },
  computed: {
    ...mapGetters({
      'isCommunity': 'isCommunity',
    })
  },
  watch: {
    isCommunity() {
      this.initNotifyInterval()
    }
  },
  methods: {
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
        new Noty(this.upsellNotificationOptions).show()
      }, intervalTime)

      this.timeoutID = setTimeout(() => {
        new Noty(this.upsellNotificationOptions).show()
      }, 1000 * 60 * 5)
    }
  },
  mounted() {
    this.initNotifyInterval()
  }
})
</script>

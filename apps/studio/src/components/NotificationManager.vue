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
        text: "",  // 将在 created 生命周期中设置
        timeout: 1000 * 60 * 5,
        queue: "upsell",
        killer: 'upsell',
        layout: 'bottomRight',
        closeWith: ['button'],
        buttons: [] // 将在 created 生命周期中设置
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
    updateNotificationText() {
      this.upsellNotificationOptions.text = this.$t('notification.upsell.text')
      this.upsellNotificationOptions.buttons = [
        Noty.button(this.$t('common.close'), 'btn btn-flat', () => Noty.closeAll('upsell')),
        Noty.button(this.$t('notification.upsell.getStarted'), 'btn btn-primary', () => window.main.openExternally('https://docs.beekeeperstudio.io/docs/upgrading-from-the-community-edition'))
      ]
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

      // 更新文本以反映当前语言
      this.updateNotificationText()

      this.notificationInterval = setInterval(() => {
        // 在显示通知前更新文本，以便在语言切换后显示正确的语言
        this.updateNotificationText()
        new Noty(this.upsellNotificationOptions).show()
      }, intervalTime)

      this.timeoutID = setTimeout(() => {
        // 在显示通知前更新文本，以便在语言切换后显示正确的语言
        this.updateNotificationText()
        new Noty(this.upsellNotificationOptions).show()
      }, 1000 * 60 * 5)
    }
  },
  mounted() {
    this.initNotifyInterval()
  },
  created() {
    // 初始化文本
    this.updateNotificationText()
  }
})
</script>

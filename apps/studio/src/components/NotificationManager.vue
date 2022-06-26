<script lang="ts">
import { SmartLocalStorage } from '@/common/LocalStorage'
import Vue from 'vue'


export default Vue.extend({
  mounted() {
    const today = new Date()
    const upgradeSuggested = SmartLocalStorage.getDate('ultimate-upsell')
    const lastWeek = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000))
    if (!upgradeSuggested || upgradeSuggested < lastWeek) {
      setTimeout(() => {
        
      }, (1000 * 60 * 5)) // 5 minutes
    }
  }
})
</script>
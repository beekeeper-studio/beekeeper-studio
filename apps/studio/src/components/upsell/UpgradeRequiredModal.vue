<template>
  <portal to="modals">
    <modal
      class="vue-dialog beekeeper-modal upgrade-modal"
      name="upgrade-modal"
      height="auto"
      :width="modalWidth"
      @opened="onOpened"
      @closed="onClosed"
    >
      <div class="dialog-content" v-kbd-trap="true">
        <UpgradeContent
          :trigger-feature="triggerFeature"
          :custom-title="customTitle"
          :message="message"
          closable
          @close="$modal.hide('upgrade-modal')"
        />
      </div>
    </modal>
  </portal>
</template>

<script lang="ts">
import { AppEvent } from '@/common/AppEvent'
import Vue from 'vue'
import UpgradeContent from './UpgradeContent.vue'
import { inferFeature } from './upgrade-features'

export default Vue.extend({
  components: { UpgradeContent },
  data() {
    return {
      message: null as string | null,
      customTitle: null as string | null,
      triggerFeature: null as string | null,
      isOpen: false,
      modalWidth: 820,
    }
  },
  methods: {
    showModal(payload?: string | { message?: string; feature?: string; title?: string }) {
      if (!this.$store.getters.isCommunity) return

      let message: string | null = null
      let feature: string | null = null
      let title: string | null = null
      if (typeof payload === 'string') {
        message = payload
        feature = inferFeature(payload)
      } else if (payload && typeof payload === 'object') {
        message = payload.message ?? null
        feature = payload.feature ?? inferFeature(message)
        title = payload.title ?? null
      }

      this.message = message
      this.customTitle = title
      this.triggerFeature = feature
      this.$modal.show('upgrade-modal')
    },
    onOpened() {
      this.isOpen = true
      this.$root.$emit('upgradeModalOpened')
    },
    onClosed() {
      this.isOpen = false
      this.$root.$emit('upgradeModalClosed')
    },
    trapShortcuts(e: KeyboardEvent) {
      // Only trap while the modal is actually visible. The listener stays
      // attached for the lifetime of the component, so the open/closed flag
      // is what gates capture — much safer than adding/removing listeners
      // and risking a stuck listener if a close event ever doesn't fire.
      if (!this.isOpen) return
      // Escape is handled by vue-js-modal to close. Everything else with a
      // modifier (Ctrl/Cmd) gets swallowed so global tab shortcuts (Ctrl+Tab,
      // Ctrl+W, Ctrl+T, Ctrl+1..9, etc.) don't fire underneath the modal.
      if (e.key === 'Escape') return
      if (e.ctrlKey || e.metaKey) {
        e.stopImmediatePropagation()
      }
    }
  },
  mounted() {
    this.$root.$on(AppEvent.upgradeModal, this.showModal)
    document.addEventListener('keydown', this.trapShortcuts, true)
  },
  beforeDestroy() {
    this.$root.$off(AppEvent.upgradeModal, this.showModal)
    document.removeEventListener('keydown', this.trapShortcuts, true)
  }
})
</script>

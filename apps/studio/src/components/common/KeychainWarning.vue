<template>
  <div
    v-if="visible"
    class="keychain-warning alert alert-warning"
  >
    <div class="alert-body">
      <i class="material-icons">warning</i>
      <span>
        Your saved credentials are not protected by the OS keychain. For better security, install a keyring service.
        <a
          href="https://docs.beekeeperstudio.io/user_guide/encryption-key-security/"
          @click.prevent="openLink"
        >Read more</a>
      </span>
    </div>
    <a
      class="close-button"
      @click.prevent="dismiss"
    >
      <i class="material-icons">close</i>
    </a>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { SmartLocalStorage } from '@/common/LocalStorage'

export default Vue.extend({
  name: 'KeychainWarning',
  data() {
    return {
      dismissed: SmartLocalStorage.getBool('dismissedKeychainWarning', false),
    }
  },
  computed: {
    insecure(): boolean {
      return !!window.keychainInsecure
    },
    visible(): boolean {
      return this.insecure && !this.dismissed
    }
  },
  methods: {
    dismiss() {
      SmartLocalStorage.setBool('dismissedKeychainWarning', true)
      this.dismissed = true
    },
    openLink() {
      window.main.openExternally('https://docs.beekeeperstudio.io/user_guide/encryption-key-security/')
    }
  }
})
</script>

<style lang="scss" scoped>
.keychain-warning {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;

  .alert-body {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    i {
      font-size: 18px;
    }

    a {
      font-weight: 600;
    }
  }

  .close-button {
    cursor: pointer;
    opacity: 0.7;
    &:hover {
      opacity: 1;
    }
  }
}
</style>

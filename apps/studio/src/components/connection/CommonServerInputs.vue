<template>
  <div class="host-port-user-password">
    <slot name="header" />
    <div class="row">
      <div
        class="form-group col"
        v-if="supportsSocketPath"
      >
        <label for="connectionMode">Connection Mode</label>
        <select
          name=""
          v-model="config.socketPathEnabled"
          id=""
        >
          <option :value="false">
            Host and Port
          </option>
          <option :value="true">
            Socket
          </option>
        </select>
      </div>
    </div>
    <div
      class="row gutter"
      v-show="config.socketPathEnabled"
    >
      <div class="col form-group" :class="{ s9: supportsSocketPathWithCustomPort }">
        <label for="socketPath">Socket Path</label>
        <input
          id="socketPath"
          class="form-control"
          v-model="config.socketPath"
          type="text"
          name="socketPath"
        >
      </div>
      <div class="col s3 form-group" v-if="supportsSocketPathWithCustomPort">
        <label for="port">Port</label>
        <masked-input
          :value="config.port"
          :privacy-mode="privacyMode"
          :type="'number'"
          @input="val => config.port = val"
        />
      </div>
    </div>
    <div
      class="row gutter"
      v-show="!config.socketPathEnabled"
    >
      <div class="col s9 form-group">
        <label for="Host">Host</label>
        <masked-input
          :value="config.host"
          :privacy-mode="privacyMode"
          @input="val => config.host = val"
        />
      </div>
      <div class="col s3 form-group">
        <label for="port">Port</label>
        <masked-input
          :value="config.port"
          :privacy-mode="privacyMode"
          :type="'number'"
          @input="val => config.port = val"
        />
      </div>
    </div>

    <common-ssl
      :config="config"
      :ssl-help="sslHelp"
      :supportComplexSSL="supportComplexSSL"
    />

    <div class="row gutter">
      <div class="col form-group" :class="[showPasswordForm ? 's6' : 's12']">
        <label for="user">User</label>
        <masked-input
          :value="config.username"
          :privacy-mode="privacyMode"
          @input="val => config.username = val"
        />
      </div>
      <div class="col s6 form-group" v-show="showPasswordForm">
        <label for="password">Password</label>
        <input
          :type="togglePasswordInputType"
          v-model="config.password"
          class="password form-control"
        >
        <i
          @click.prevent="togglePassword"
          class="material-icons password-icon"
        >{{ togglePasswordIcon }}</i>
      </div>
    </div>
    <slot />
    <div class="form-group expand">
      <label
        v-if="config.connectionType !== 'cassandra'"
        for="defaultDatabase"
      >Default {{ topLevelEntityName }}</label>
      <label
        v-else
        for="defaultDatabase"
      >Keyspace <span class="optional-text">(optional)</span></label>
      <input
        type="text"
        class="form-control"
        v-model="config.defaultDatabase"
      >
    </div>
  </div>
</template>

<script>
import { findClient } from '@/lib/db/clients'
import MaskedInput from '@/components/MaskedInput.vue'
import CommonSsl from './CommonSsl.vue'
import { mapState } from 'vuex'

export default {
  props: {
    config: Object,
    sslHelp: String,
    supportComplexSSL: {
      type: Boolean,
      default: true
    },
    showPasswordForm: {
      type: Boolean,
      default: true
    }
  },
  components: {
    MaskedInput,
    CommonSsl
  },
  data() {
    return {
      showPassword: false,
    }
  },
  computed: {
    ...mapState('settings', ['privacyMode']),
    togglePasswordIcon() {
      return this.showPassword ? "visibility_off" : "visibility"
    },
    togglePasswordInputType() {
      return this.showPassword ? "text" : "password"
    },
    supportsSocketPath() {
      return findClient(this.config.connectionType).supportsSocketPath
    },
    supportsSocketPathWithCustomPort() {
      return findClient(this.config.connectionType).supportsSocketPathWithCustomPort
    },
    topLevelEntityName() {
      return findClient(this.config.connectionType).topLevelEntity || 'Database'
    }
  },
  methods: {
    async onPaste(event) {
      const data = event.clipboardData.getData('text')
      try {
        await this.$util.send('appdb/saved/parseUrl', { url: data });
        event.preventDefault();
      } catch {
        return;
      }
    },
    togglePassword() {
      this.showPassword = !this.showPassword
    }
  }
}
</script>

<style lang="scss" scoped>
.optional-text {
  font-style: italic;
  padding-left: .2rem;
}
</style>

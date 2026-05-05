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
          @input="val => config.host = val"
        />
      </div>
      <div class="col s3 form-group">
        <label for="port">Port</label>
        <masked-input
          :value="config.port"
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
          @input="val => config.username = val"
        />
      </div>
      <div class="col s6 form-group" v-show="showPasswordForm">
        <label for="password">{{ passwordLabel }}</label>
        <password-input v-model="config.password" />
      </div>
    </div>
    <slot />
    <div class="form-group expand">
      <label
        v-if="!['cassandra', 'scylladb'].includes(config.connectionType)"
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
import PasswordInput from '@/components/common/form/PasswordInput.vue'
import CommonSsl from './CommonSsl.vue'

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
    },
    passwordLabel: {
      type: String,
      default: 'Password'
    }
  },
  components: {
    MaskedInput,
    PasswordInput,
    CommonSsl
  },
  computed: {
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
  }
}
</script>

<style lang="scss" scoped>
.optional-text {
  font-style: italic;
  padding-left: .2rem;
}
</style>

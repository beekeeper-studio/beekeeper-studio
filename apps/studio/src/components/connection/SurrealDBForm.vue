<template>
  <div class="with-connection-type">
    <div class="alert alert-warning">
      <i class="material-icons">warning</i>
      <span>
        SurrealDB support is in alpha.
        <a href="https://docs.beekeeperstudio.io/user_guide/connecting/surrealdb">Supported features</a>,
        <a href="https://github.com/beekeeper-studio/beekeeper-studio/issues/new/choose">report an issue</a>.
      </span>
    </div>
    <div class="host-port-user-password">
      <div class="form-group col">
        <label for="protocol">Protocol</label>
        <select name="protocol" id="protocolSelect" v-model="config.surrealDbOptions.protocol">
          <option :value="undefined" disabled hidden>Select a protocol...</option>
          <option :key="`${p}`" v-for="p in protocols" :value="p">
            {{ p }}
          </option>
        </select>
      </div>
      <div class="row gutter">
        <div class="form-group col s9">
          <label for="server">
            Host
          </label>
          <masked-input
            :value="config.host"
            :privacyMode="privacyMode"
            @input="val => config.host = val"
          />
        </div>
        <div class="form-group col s3">
          <label for="port">Port</label>
          <masked-input
            :value="config.port"
            :privacyMode="privacyMode"
            :type="'number'"
            @input="val => config.port = val"
          />
        </div>
      </div>
    </div>
    <div class="form-group col">
      <label for="authenticationType">Authentication Method</label>
      <select name="authMethod" id="surrealAuthMethod" v-model="config.surrealDbOptions.authType">
        <option :value="undefined" disabled hidden>Select...</option>
        <option :key="`${t.value}-${t.name}`" v-for="t in authTypes" :value="t.value">
          {{ t.name }}
        </option>
      </select>
    </div>
    <div v-if="!this.isTokenAuth" class="row gutter">
      <div class="form-group col s6">
        <label for="user">User</label>
        <masked-input
          :value="config.username"
          :privacyMode="privacyMode"
          @input="val => config.username = val"
        />
      </div>
      <div class="col s6 form-group">
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
    <div v-else class="row gutter">
      <div class="form-group col">
        <label for="token">Token</label>
        <input
          :type="togglePasswordInputType"
          v-model="config.surrealDbOptions.token"
          class="password form-control"
        >
        <i
          @click.prevent="togglePassword"
          class="material-icons password-icon"
        >{{ togglePasswordIcon }}</i>
      </div>
    </div>
    <div class="row gutter">
      <div class="form-group col s6">
        <label for="namespace">Namespace</label>
        <input
          name="namespace"
          type="text"
          class="form-control"
          v-model="config.surrealDbOptions.namespace"
        >
      </div>
      <div class="form-group col s6">
        <label for="database">Database</label>
        <input
          name="database"
          type="text"
          class="form-control"
          v-model="config.defaultDatabase"
        >
      </div>
    </div>
    <common-advanced :config="config" />
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { SurrealAuthType, SurrealAuthTypes } from '../../lib/db/types';
import CommonServerInputs from './CommonServerInputs.vue'
import CommonAdvanced from './CommonAdvanced.vue'
import MaskedInput from '@/components/MaskedInput.vue'
import { mapState } from 'vuex';

export default Vue.extend({
  components: { CommonServerInputs, MaskedInput, CommonAdvanced },
  props: ['config'],
  data() {
    return {
      authTypes: SurrealAuthTypes,
      authType: null,
      protocols: ['http', 'https', 'ws', 'wss'],
      showPassword: false
    }
  },
  computed: {
    ...mapState('settings', ['privacyMode']),
    togglePasswordIcon() {
      return this.showPassword ? "visibility_off" : "visibility";
    },
    togglePasswordInputType() {
      return this.showPassword ? "text" : "password"
    },
    isTokenAuth() {
      return this.config.surrealDbOptions.authType === SurrealAuthType.Token;
    }
  },
  methods: {
    togglePassword() {
      this.showPassword = !this.showPassword;
    }
  }
})

</script>

<style>

</style>

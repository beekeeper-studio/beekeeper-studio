<template>
  <div class="with-connection-type">
    <div class="form-group col">
      <label for="authMethod">Authentication Method</label>
      <select
        name="authMethod"
        v-model="config.hanaOptions.authMethod"
      >
        <option
          v-for="option in authTypes"
          :key="option.value"
          :value="option.value"
        >
          {{ option.name }}
        </option>
      </select>
    </div>
    <common-server-inputs
      :config="config"
      :hide-credentials="!isPasswordAuth"
    >
      <div
        v-if="isTokenAuth"
        class="form-group expand"
      >
        <label for="token">{{ tokenLabel }}</label>
        <password-input v-model="config.hanaOptions.token" />
      </div>
      <div v-if="isX509Auth">
        <div class="form-group expand">
          <label for="x509CertPath">Client Certificate File</label>
          <file-picker
            v-model="config.hanaOptions.x509CertPath"
            input-id="x509CertPath"
            editable
          />
          <span class="help-block">PEM file containing the certificate chain and private key</span>
        </div>
        <div class="form-group expand">
          <label for="x509CertPassword">Private Key Password <span class="optional-text">(optional)</span></label>
          <password-input v-model="config.hanaOptions.x509CertPassword" />
        </div>
      </div>
    </common-server-inputs>
  </div>
</template>

<script>
import CommonServerInputs from './CommonServerInputs.vue'
import FilePicker from "@/components/common/form/FilePicker.vue"
import PasswordInput from '@/components/common/form/PasswordInput.vue'
import { HanaAuthType, HanaAuthTypes } from '@/lib/db/types'

export default {
  components: { CommonServerInputs, FilePicker, PasswordInput },
  props: ['config'],
  data() {
    return {
      authTypes: HanaAuthTypes,
    }
  },
  computed: {
    authMethod() {
      return this.config.hanaOptions.authMethod ?? HanaAuthType.Password;
    },
    isPasswordAuth() {
      return this.authMethod === HanaAuthType.Password;
    },
    isTokenAuth() {
      return this.authMethod === HanaAuthType.Jwt || this.authMethod === HanaAuthType.Saml;
    },
    isX509Auth() {
      return this.authMethod === HanaAuthType.X509;
    },
    tokenLabel() {
      return this.authMethod === HanaAuthType.Jwt ? 'JWT Token' : 'SAML Assertion';
    },
  },
  created() {
    if (this.config.hanaOptions.authMethod == null) {
      this.config.hanaOptions.authMethod = HanaAuthType.Password;
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

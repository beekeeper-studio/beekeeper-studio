<template>
  <div class="dynamodb-form">
    <div class="alert alert-info">
      <i class="material-icons-outlined">info</i>
      <div>
        DynamoDB support is in beta. Connect to a region or a local endpoint
        (e.g. <a href="https://hub.docker.com/r/amazon/dynamodb-local">amazon/dynamodb-local</a>).
        <a href="https://github.com/beekeeper-studio/beekeeper-studio/issues/new/choose">Report an issue</a>.
      </div>
    </div>

    <div class="form-group">
      <label for="authType">Authentication</label>
      <select
        id="authType"
        class="form-control"
        v-model="authType"
      >
        <option v-for="t in authTypes" :key="t.value" :value="t.value">
          {{ t.name }}
        </option>
      </select>
    </div>

    <common-iam :config="config" :auth-type="authType" />

    <div class="form-group">
      <label for="endpoint">
        Custom Endpoint <span class="hint">(optional — for DynamoDB Local)</span>
      </label>
      <input
        id="endpoint"
        type="text"
        class="form-control"
        placeholder="e.g. http://localhost:8000"
        v-model="endpoint"
      >
    </div>
  </div>
</template>

<script>
import CommonIam from './CommonIam.vue'
import { IamAuthType, IamAuthTypes } from '@/lib/db/types'

export default {
  props: ['config', 'testing'],
  components: { CommonIam },
  data() {
    return {
      authTypes: IamAuthTypes,
    }
  },
  computed: {
    authType: {
      get() {
        return this.config.iamAuthOptions?.authType || IamAuthType.Key
      },
      set(value) {
        if (!this.config.iamAuthOptions) {
          this.$set(this.config, 'iamAuthOptions', {})
        }
        this.$set(this.config.iamAuthOptions, 'authType', value)
        this.$set(this.config.iamAuthOptions, 'iamAuthenticationEnabled', true)
      }
    },
    endpoint: {
      get() {
        return this.config.dynamoDbOptions?.endpoint || ''
      },
      set(value) {
        if (!this.config.dynamoDbOptions) {
          this.$set(this.config, 'dynamoDbOptions', {})
        }
        this.$set(this.config.dynamoDbOptions, 'endpoint', value || undefined)
      }
    }
  },
  mounted() {
    if (!this.config.iamAuthOptions) {
      this.$set(this.config, 'iamAuthOptions', {})
    }
    if (!this.config.iamAuthOptions.authType) {
      this.$set(this.config.iamAuthOptions, 'authType', IamAuthType.Key)
    }
    // DynamoDB always needs IAM enabled so CommonIam renders the key/profile/CLI UI.
    if (!this.config.iamAuthOptions.iamAuthenticationEnabled) {
      this.$set(this.config.iamAuthOptions, 'iamAuthenticationEnabled', true)
    }
    if (!this.config.dynamoDbOptions) {
      this.$set(this.config, 'dynamoDbOptions', {})
    }
  }
}
</script>

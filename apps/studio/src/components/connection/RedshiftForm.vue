<template>
  <div class="with-connection-type">
    <div class="form-group col">
      <label for="authenticationType">Authentication Method</label>
      <!-- need to take the value -->
      <select name="" v-model="authType" id="" :disabled="disabled">
        <option :key="`${t.value}`" v-for="t in authTypes" :value="t.value" :selected="authType === t.value">
          {{ t.name }}
        </option>
      </select>
    </div>
    <common-server-inputs :config="config" :disabled="disabled" />
    <common-iam v-show="iamAuthenticationEnabled" :config="config" :auth-type="authType" :disabled="disabled" />
    <common-advanced :config="config" :disabled="disabled" />
  </div>
</template>
<script>

import CommonServerInputs from './CommonServerInputs.vue'
import CommonAdvanced from './CommonAdvanced.vue'
import {IamAuthTypes} from "@/lib/db/types";
import {AppEvent} from "@/common/AppEvent";
import _ from "lodash";
import CommonIam from "@/components/connection/CommonIam.vue";

export default {
  components: {CommonIam, CommonServerInputs, CommonAdvanced },
  data() {
    return {
      iamAuthenticationEnabled: this.config.iamAuthOptions?.authType?.includes?.('iam'),
      authType: this.config.iamAuthOptions?.authType || 'default',
      authTypes: [{ name: 'Username / Password', value: 'default' }, ...IamAuthTypes]
    }
  },
  watch: {
    async authType() {
      if (this.authType.includes('iam')) {
        this.iamAuthenticationEnabled = true;
        this.config.iamAuthOptions.authType = this.authType
      }
    },
    iamAuthenticationEnabled() {
      this.config.iamAuthOptions.iamAuthenticationEnabled = this.iamAuthenticationEnabled
    }
  },
  props: {
    config: Object,
    disabled: {
      type: Boolean,
      default: false
    }
  },
}
</script>

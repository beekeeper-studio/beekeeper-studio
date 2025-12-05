<template>
  <div class="with-connection-type">
    <div class="form-group col">
      <label for="authenticationType">Authentication Method</label>
      <!-- need to take the value -->
      <select name="" v-model="authType" id="">
        <option :key="`${t.value}`" v-for="t in authTypes" :value="t.value" :selected="authType === t.value">
          {{ t.name }}
        </option>
      </select>
    </div>
    <common-server-inputs :config="config" />
    <common-iam v-show="iamAuthenticationEnabled" :config="config" :auth-type="authType" />
    <common-advanced :config="config" />
  </div>
</template>
<script>

import CommonServerInputs from './CommonServerInputs.vue'
import CommonAdvanced from './CommonAdvanced.vue'
import {IamAuthTypes} from "@/lib/db/types";
import CommonIam from "@/components/connection/CommonIam.vue";

export default {
  components: {CommonIam, CommonServerInputs, CommonAdvanced },
  data() {
    return {
      iamAuthenticationEnabled: this.config.redshiftOptions?.authType?.includes?.('iam'),
      authType: this.config.redshiftOptions?.authType || 'default',
      authTypes: [{ name: 'Username / Password', value: 'default' }, ...IamAuthTypes]
    }
  },
  watch: {
    async authType() {
      this.iamAuthenticationEnabled = this.authType.includes('iam');
      this.config.redshiftOptions.authType = this.authType;
    },
    iamAuthenticationEnabled() {
      this.config.redshiftOptions.iamAuthenticationEnabled = this.iamAuthenticationEnabled
    }
  },
  props: ['config'],
}
</script>

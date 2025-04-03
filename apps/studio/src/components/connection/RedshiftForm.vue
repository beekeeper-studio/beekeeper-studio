<template>
  <div class="with-connection-type">
    <div class="form-group col">
      <label for="authenticationType">{{ $t('Authentication Method') }}</label>
      <!-- need to take the value -->
      <select name="" v-model="authType" id="">
        <option :key="`${t.value}`" v-for="t in authTypes" :value="t.value" :selected="authType === t.value">
          {{ $t(t.name) }}
        </option>
      </select>
    </div>
    <common-server-inputs :config="config" />
    <common-iam v-show="iamAuthenticationEnabled" :config="config" />
    <common-advanced :config="config" />
  </div>
</template>
<script>

import CommonServerInputs from './CommonServerInputs.vue'
import CommonAdvanced from './CommonAdvanced.vue'
import {IamAuthTypes, getIamAuthTypes} from "@/lib/db/types";
import {AppEvent} from "@/common/AppEvent";
import _ from "lodash";
import CommonIam from "@/components/connection/CommonIam.vue";

export default {
  components: {CommonIam, CommonServerInputs, CommonAdvanced },
  data() {
    return {
      authType: this.config.redshiftOptions?.authType || 'default',
      authTypes: [{ name: this.$t('Username / Password'), value: 'default' }, ...getIamAuthTypes()]
    }
  },
  computed: {
    iamAuthenticationEnabled() {
      const { redshiftOptions } = this.config;
      return redshiftOptions?.authType?.includes('iam') || false;
    }
  },
  watch: {
    '$i18n.locale': {
      immediate: true,
      handler() {
        // Update authentication type options when language changes
        this.authTypes = [{ name: this.$t('Username / Password'), value: 'default' }, ...getIamAuthTypes()]
      }
    },
    async authType() {
      console.log("Auth type changed", this.authType, 'community?', this.$config.isCommunity)
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

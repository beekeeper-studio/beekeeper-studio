<template>
  <div class="with-connection-type">
    <div class="form-group col">
      <label for="authenticationType">{{ $t('connection.authenticationMethod') }}</label>
      <!-- need to take the value -->
      <select name="" v-model="authType" id="">
        <option :key="`${t.value}`" v-for="t in authTypes" :value="t.value" :selected="authType === t.value">
          {{ t.name }}
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
import {IamAuthTypes} from "@/lib/db/types";
import {AppEvent} from "@/common/AppEvent";
import _ from "lodash";
import CommonIam from "@/components/connection/CommonIam.vue";

export default {
  components: {CommonIam, CommonServerInputs, CommonAdvanced },
  data() {
    return {
      authType: this.config.redshiftOptions?.authType || 'default',
      authTypes: [
        { name: this.$t ? this.$t('connection.usernamePassword') : 'Username / Password', value: 'default' }, 
        ...(this.$t ? IamAuthTypes.map(type => ({ 
          name: this.$t(type.nameKey), 
          value: type.value 
        })) : IamAuthTypes.map(type => ({ 
          name: type.nameKey.includes('Key') ? 'IAM Authentication Using Access Key' : 'IAM Authentication Using File', 
          value: type.value 
        })))
      ],
      iamAuthenticationEnabled: false
    }
  },
  computed: {
  },
  created() {
    // 在组件创建后更新本地化文本，确保翻译可用
    if (this.$t) {
      this.authTypes[0].name = this.$t('connection.usernamePassword');
      // 更新 IAM 认证选项的名称
      for (let i = 1; i < this.authTypes.length; i++) {
        const authType = IamAuthTypes[i-1];
        this.authTypes[i].name = this.$t(authType.nameKey);
      }
    }
    
    // 初始化IAM认证状态
    const { redshiftOptions } = this.config;
    this.iamAuthenticationEnabled = redshiftOptions?.authType?.includes('iam') || false;
  },
  watch: {
    async authType() {
      console.log(this.$t('connection.redshift.iam'), this.authType, this.$t('connection.redshift.iamAuthentication'), this.$config.isCommunity)
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

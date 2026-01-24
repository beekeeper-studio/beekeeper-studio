<template>
  <div class="with-connection-type">
    <div class="form-group col">
      <label for="authenticationType">Authentication Method</label>
      <!-- need to take the value -->
      <select name="" v-model="authType" id="">
        <option :key="`${t.value}-${t.name}`" v-for="t in authTypes" :value="t.value" :selected="authType === t.value">
          {{ t.name }}
        </option>
      </select>
    </div>
    <common-server-inputs v-show="showServerInputs" :config="config" :show-password-form="showPasswordForm" />

    <common-iam v-show="iamAuthenticationEnabled" :auth-type="authType" :config="config" />
    <common-advanced :config="config" />
    <common-entra-id v-show="azureAuthEnabled" :auth-type="authType" :config="config" />
  </div>
</template>

<script>

import CommonServerInputs from './CommonServerInputs.vue'
import CommonAdvanced from './CommonAdvanced.vue'
import CommonIam from './CommonIam.vue'
import CommonEntraId from './CommonEntraId.vue'
import {AppEvent} from "@/common/AppEvent";
import {AzureAuthType, AzureAuthTypes, IamAuthTypes} from "@/lib/db/types";
import _ from "lodash";
import { mapGetters } from 'vuex';

export default {
  components: {CommonEntraId, CommonServerInputs, CommonAdvanced, CommonIam},
  props: ['config'],
  mounted() {
    this.azureAuthEnabled = this.config?.azureAuthOptions?.azureAuthEnabled || false
  },
  data() {
    return {
      azureAuthEnabled: !!this.config?.azureAuthOptions?.azureAuthEnabled,
      iamAuthenticationEnabled: !!this.config.iamAuthOptions?.iamAuthenticationEnabled,
      authType: this.config.iamAuthOptions?.authType || this.config.azureAuthOptions?.azureAuthType || 'default',
      authTypes: [{ name: 'Username / Password', value: 'default' }, ...IamAuthTypes, ...AzureAuthTypes.filter(auth => auth.value === AzureAuthType.CLI)],
      accountName: null,
      signingOut: false,
      errorSigningOut: null,
      showPasswordForm: true
    }
  },
  computed: {
    ...mapGetters(['isCommunity']),
    showServerInputs() {
      return !this.azureAuthEnabled
    }
  },
  watch: {
    async authType() {
      if (this.authType === 'default') {
        this.iamAuthenticationEnabled = false
        this.azureAuthEnabled = false
        this.showPasswordForm = true
      } else {
        if (this.isCommunity) {
          // we want to display a modal
          this.$root.$emit(AppEvent.upgradeModal, "Upgrade required to use this authentication type");
          this.authType = 'default'
        } else {
          this.showPasswordForm = false;
          if (typeof this.authType === 'string' && this.authType.includes('iam')) {
            this.iamAuthenticationEnabled = true;
            this.config.iamAuthOptions.authType = this.authType;
          } else if (this.authType === AzureAuthType.CLI) {
            this.azureAuthEnabled = true;
            this.config.azureAuthOptions.azureAuthType = this.authType;
          }
        }
      }

      const authId = this.config.azureAuthOptions?.authId || this.config?.authId
      if (this.authType === AzureAuthType.CLI && !_.isNil(authId)) {
        this.accountName = await this.connection.azureGetAccountName(authId);
      } else {
        this.accountName = null
      }
    },
    config() {
      if (this.config.azureAuthOptions.azureAuthEnabled) {
        this.authType = this.config.azureAuthOptions.azureAuthType;
      } else if (this.config.iamAuthOptions.iamAuthenticationEnabled) {
        this.authType = this.config.iamAuthOptions.authType;
      } else {
        this.authType = 'default';
      }
    },
    azureAuthEnabled() {
      this.config.azureAuthOptions.azureAuthEnabled = this.azureAuthEnabled
    },
    iamAuthenticationEnabled() {
      this.config.iamAuthOptions.iamAuthenticationEnabled = this.iamAuthenticationEnabled
    }
  },
}
</script>

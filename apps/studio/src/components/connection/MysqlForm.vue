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
    <common-server-inputs v-show="showServerInputs" :config="config" />

    <div v-show="iamAuthenticationEnabled" class="host-port-user-password">
      <div class="row gutter">
        <div class="form-group col s9">
          <label for="server">
            Host
          </label>
          <input name="server" type="text" class="form-control" v-model="config.host">
        </div>
        <div class="form-group col s3">
          <label for="database">Port</label>
          <input type="number" class="form-control" name="port" v-model.number="config.port">
        </div>
      </div>
      <div class="gutter">
        <div class="form-group">
          <label for="database">Database</label>
          <input name="database" type="text" class="form-control" v-model="config.defaultDatabase">
        </div>
        <div class="form-group">
          <label for="user">User</label>
          <input name="user" type="text" class="form-control" v-model="config.username">
        </div>
      </div>
    </div>
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
      iamAuthenticationEnabled: !!this.config.redshiftOptions?.iamAuthenticationEnabled,
      authType: this.config.redshiftOptions?.authType || this.config.azureAuthOptions?.azureAuthType || 'default',
      authTypes: [{ name: 'Username / Password', value: 'default' }, ...IamAuthTypes, ...AzureAuthTypes.filter(auth => auth.value === AzureAuthType.CLI)],
      accountName: null,
      signingOut: false,
      errorSigningOut: null,
    }
  },
  computed: {
    ...mapGetters(['isCommunity']),
    showServerInputs() {
      return !this.azureAuthEnabled && !this.iamAuthenticationEnabled
    }
  },
  watch: {
    async authType() {
      console.log("Auth type changed", this.authType, 'community?', this.$config.isCommunity)
      if (this.authType === 'default') {
        this.iamAuthenticationEnabled = false
        this.azureAuthEnabled = false
      } else {
        if (this.isCommunity) {
          // we want to display a modal
          this.$root.$emit(AppEvent.upgradeModal, "Upgrade required to use this authentication type");
          this.authType = 'default'
        } else {
          this.config.redshiftOptions.authType = this.authType
          this.config.azureAuthOptions.azureAuthType = this.authType
          this.azureAuthEnabled = this.authType === AzureAuthType.CLI
          this.iamAuthenticationEnabled = typeof this.authType === 'string' && this.authType.includes('iam')
        }
      }

      const authId = this.config.azureAuthOptions?.authId || this.config?.authId
      if (this.authType === AzureAuthType.CLI && !_.isNil(authId)) {
        this.accountName = await this.connection.azureGetAccountName(authId);
      } else {
        this.accountName = null
      }
    },
    azureAuthEnabled() {
      this.config.azureAuthOptions.azureAuthEnabled = this.azureAuthEnabled
    },
    iamAuthenticationEnabled() {
      this.config.redshiftOptions.iamAuthenticationEnabled = this.iamAuthenticationEnabled
    }
  },
}
</script>

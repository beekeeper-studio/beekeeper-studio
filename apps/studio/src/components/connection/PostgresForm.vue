<template>
  <div class="with-connection-type">
    <div class="form-group col" v-show="!isCockroach">
      <label for="authenticationType">Authentication Method</label>
      <!-- need to take the value -->
      <select name="" v-model="authType" id="">
        <option :key="`${t.value}-${t.name}`" v-for="t in authTypes" :value="t.value" :selected="authType === t.value">
          {{ t.name }}
        </option>
      </select>
    </div>
    <common-server-inputs v-show="showServerInputs" :config="config" />

    <div class="form-group" v-if="isCockroach">
      <label for="Cluster ID">
        CockroachDB Cloud Cluster ID
        <i class="material-icons"
           v-tooltip="`Go to CockroachDB online -> Connect -> parameters only -> copy from 'options'`"
        >help_outlined</i>
      </label>
      <input type="text" class="form-control" v-model="config.options.cluster">
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
import {AppEvent} from "@/common/AppEvent";
import {AzureAuthType, AzureAuthTypes, IamAuthTypes} from "@/lib/db/types";
import { mapGetters } from 'vuex';
import _ from "lodash";
import CommonEntraId from "@/components/connection/CommonEntraId.vue";

export default {
  components: {CommonEntraId, CommonServerInputs, CommonAdvanced, CommonIam },
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
    }
  },
  watch: {
    isCockroach() {
      if(this.isCockroach) {
        this.iamAuthenticationEnabled = false
        this.authType = 'default'
      }
    },
    async authType() {
      if (this.authType === 'default') {
        this.iamAuthenticationEnabled = false
        this.azureAuthEnabled = false
      } else {
        if (this.isCommunity) {
          // we want to display a modal
          this.$root.$emit(AppEvent.upgradeModal, "Upgrade required to use this authentication type");
          this.authType = 'default'
        } else {
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
      if (this.authType === AzureAuthType.AccessToken && !_.isNil(authId)) {
        this.accountName = await this.connection.azureGetAccountName(authId);
      } else {
        this.accountName = null
      }
    },
    azureAuthEnabled() {
      this.config.azureAuthOptions.azureAuthEnabled = this.azureAuthEnabled
    },
    iamAuthenticationEnabled() {
      this.config.iamAuthOptions.iamAuthenticationEnabled = this.iamAuthenticationEnabled
    }
  },
  computed: {
    ...mapGetters(['isCommunity']),
    isCockroach() {
      return this.config.connectionType === 'cockroachdb'
    },
    showServerInputs() {
      return !this.azureAuthEnabled
    }
  }
};
</script>

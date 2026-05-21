<template>
  <div class="with-connection-type">
    <div class="form-group col">
      <label for="authenticationType">Authentication Method</label>
      <select name="" v-model="authType" id="">
        <option :key="`${t.value}-${t.name}`" v-for="t in authTypes" :value="t.value" :selected="authType === t.value">
          {{ t.name }}
        </option>
      </select>
    </div>
    <div class="row gutter" v-if="jwtAuthEnabled">
      <div class="alert alert-info">
        <i class="material-icons-outlined">info</i>
        <div>
          Paste a CockroachDB JWT into the JWT Token field. Beekeeper will send it as the password and add the required Cockroach JWT startup option for this connection. Save Passwords is turned off by default so you can paste a fresh token next time.
        </div>
      </div>
    </div>
    <common-server-inputs
      v-show="showServerInputs"
      :config="config"
      :show-password-form="showPasswordForm"
      :password-label="passwordLabel"
    />

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
    <common-entra-id v-show="azureAuthEnabled" :auth-type="authType" :config="config" />
    <common-advanced :config="config" />
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

const COCKROACH_JWT = 'cockroach-jwt'

function initialAuthType(config) {
  if (config.connectionType === 'cockroachdb') {
    return config.options?.jwtAuthEnabled ? COCKROACH_JWT : 'default'
  }
  return config.iamAuthOptions?.authType || config.azureAuthOptions?.azureAuthType || 'default'
}

export default {
  components: {CommonEntraId, CommonServerInputs, CommonAdvanced, CommonIam },
  props: ['config'],
  mounted() {
    this.azureAuthEnabled = this.config?.azureAuthOptions?.azureAuthEnabled || false
    if (!this.isCockroach && this.authType !== 'default') {
      this.showPasswordForm = false;
    }
  },
  data() {
    return {
      azureAuthEnabled: !!this.config?.azureAuthOptions?.azureAuthEnabled,
      iamAuthenticationEnabled: !!this.config.iamAuthOptions?.iamAuthenticationEnabled,
      authType: initialAuthType(this.config),
      signingOut: false,
      errorSigningOut: null,
      showPasswordForm: true
    }
  },
  watch: {
    isCockroach() {
      if(this.isCockroach) {
        this.iamAuthenticationEnabled = false
        this.azureAuthEnabled = false
        this.authType = this.config.options?.jwtAuthEnabled ? COCKROACH_JWT : 'default'
      } else {
        this.authType = initialAuthType(this.config)
      }
    },
    async authType() {
      if (this.isCockroach) {
        const isJwt = this.authType === COCKROACH_JWT
        this.config.options = {
          ...(this.config.options || {}),
          jwtAuthEnabled: isJwt,
        }
        if (isJwt) this.config.rememberPassword = false
        this.showPasswordForm = true
        return
      }

      if (this.authType === 'default') {
        this.iamAuthenticationEnabled = false
        this.azureAuthEnabled = false
        this.showPasswordForm = true
      } else {
        if (this.isCommunity) {
          this.$root.$emit(AppEvent.upgradeModal, "Enterprise Authentication");
          this.authType = 'default'
        } else {
          this.showPasswordForm = false
          if (typeof this.authType === 'string' && this.authType.includes('iam')) {
            this.iamAuthenticationEnabled = true;
            this.azureAuthEnabled = false;
            this.config.iamAuthOptions.authType = this.authType;
          } else if (this.authType === AzureAuthType.CLI) {
            this.azureAuthEnabled = true;
            this.iamAuthenticationEnabled = false;
            this.config.azureAuthOptions.azureAuthType = this.authType;
          }
        }
      }
    },
    config() {
      this.authType = initialAuthType(this.config)
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
    },
    authTypes() {
      if (this.isCockroach) {
        return [
          { name: 'Username / Password', value: 'default' },
          { name: 'JWT', value: COCKROACH_JWT },
        ]
      }
      return [
        { name: 'Username / Password', value: 'default' },
        ...IamAuthTypes,
        ...AzureAuthTypes.filter(auth => auth.value === AzureAuthType.CLI),
      ]
    },
    jwtAuthEnabled() {
      return this.isCockroach && this.authType === COCKROACH_JWT
    },
    passwordLabel() {
      return this.jwtAuthEnabled ? 'JWT Token' : 'Password'
    }
  }
};
</script>

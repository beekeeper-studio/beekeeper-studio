<template>
  <div class="with-connection-type">
    <common-server-inputs v-show="!azureAuthEnabled" :config="config">
      <div class="advanced-connection-settings">
        <h4 class="advanced-heading">
          SQL Server Options
        </h4>
        <div class="advanced-body">
          <div class="form-group">
            <label for="domain">
              Domain
              <i
                class="material-icons"
                v-tooltip="'Set \'domain\' to be logged in using Windows Integrated Authentication (NTLM)'"
              >help_outlined</i>
            </label>
            <input
              type="text"
              v-model="config.domain"
              class="form-control"
            >
          </div>
          <div class="form-group">
            <label
              for="trustServerCertificate"
              class="checkbox-group"
            >
              <input
                type="checkbox"
                name="trustServerCertificate"
                v-model="config.trustServerCertificate"
                id="trustServerCertificate"
              >
              Trust Server Certificate?
              <i
                class="material-icons"
                v-tooltip="'Use this for local dev servers and self-signed certificates. ssl -> rejectUnauthorized overrides this setting if ssl is enabled'"
              >help_outlined</i>
            </label>
          </div>
        </div>
      </div>
    </common-server-inputs>
    <common-advanced v-show="!azureAuthEnabled" :config="config" />
    <div class="advanced-connection-settings">
      <h4 
        class="advanced-heading flex"
        :class="{enabled: azureAuthEnabled}"
      >
        <span class="expand">
          Azure SSO Authentication
          <i
            v-if="$config.isCommunity"
            class="material-icons"
          >
            stars
          </i>
        </span>
        <x-switch
          @click.prevent="toggleAzureAuth"
          :toggled="azureAuthEnabled"
        />
      </h4>
      <div 
        class="advanced-body" 
        v-show="azureAuthEnabled"
      >
        <div class="form-group">
          <label for="authType">Authentication Type</label>
          <select 
            name="authType" 
            class="form-control custom-select"
            v-model="config.azureAuthOptions.azureAuthType"
            id="auth-select"
          >
            <option 
              disabled 
              hidden 
              value="null"
            >
              Select an Authentication Type...
            </option>
            <option 
              :key="`${t.value}-${t.name}`"
              v-for="t in authTypes"
              :value="t.value"
            >
              {{ t.name }}
            </option>
          </select>
        </div>
        <!-- TODO (@day): restyle this (username/password on the same line etc) -->
        <div class="form-group">
          <label for="server">Server</label>
          <input 
            name="server"
            type="text" 
            class="form-control" 
            v-model="config.host"
          >
        </div>
        <div class="form-group">
          <label for="database">Database</label>
          <input 
            name="database"
            type="text" 
            class="form-control" 
            v-model="config.defaultDatabase"
          >
        </div>
        <div class="form-group" v-show="showUser">
          <label for="user">User</label>
          <input 
            name="user"
            type="text" 
            class="form-control" 
            v-model="config.username"
          >
        </div>
        <div class="form-group" v-show="showPassword">
          <label for="password">Password</label>
          <input 
            name="password"
            type="text" 
            class="form-control" 
            v-model="config.password"
          >
        </div>
        <div class="form-group" v-show="showTenantId">
          <label for="tenantId">Tenant ID</label>
          <input 
            name="tenantId"
            type="text" 
            class="form-control" 
            v-model="config.azureAuthOptions.tenantId"
          >
        </div>
        <div class="form-group" v-show="showClientSecret">
          <label for="clientSecret">Client Secret</label>
          <input 
            name="clientSecret"
            type="text" 
            class="form-control" 
            v-model="config.clientSecret"
          >
        </div>
        <div class="form-group" v-show="showMsiEndpoint">
          <label for="msiEndpoint">MSI Endpoint</label>
          <input 
            name="msiEndpoint"
            type="text" 
            class="form-control" 
            v-model="config.msiEndpoint"
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script>

  import CommonServerInputs from './CommonServerInputs'
  import CommonAdvanced from './CommonAdvanced'
  import { AzureAuthService, AzureAuthTypes, AzureAuthType } from '../../lib/db/authentication/azure'
  import { TokenCache } from '@/common/appdb/models/token_cache';
  import platformInfo from '@/common/platform_info'
  import { AppEvent } from '@/common/AppEvent'

  export default {
    components: { CommonServerInputs, CommonAdvanced },
    props: ['config'],
    data() {
      return {
        azureAuthEnabled: this.config.azureAuthOptions?.azureAuthEnabled || false,
        authTypes: AzureAuthTypes
      }
    },
    computed: {
      showUser() {
        return [AzureAuthType.Password].includes(this.config.azureAuthOptions.azureAuthType)
      },
      showPassword() {
        return [AzureAuthType.Password].includes(this.config.azureAuthOptions.azureAuthType)
      },
      showTenantId() {
        return [AzureAuthType.Password, AzureAuthType.ServicePrincipalSecret]
          .includes(this.config.azureAuthOptions.azureAuthType)
      },
      showClientSecret() {
        return [AzureAuthType.ServicePrincipalSecret].includes(this.config.azureAuthOptions.azureAuthType)
      },
      showMsiEndpoint() {
        return [AzureAuthType.MSIVM].includes(this.config.azureAuthOptions.azureAuthType)
      },
    },
    methods: {
      async toggleAzureAuth() {
        //if (platformInfo.isCommunity) {
        //  this.$root.$emit(AppEvent.upgradeModal);
        //  return;
        //}
        this.config.azureAuthOptions.azureAuthEnabled = this.azureAuthEnabled = !this.azureAuthEnabled;
      }
    }

  }
</script>

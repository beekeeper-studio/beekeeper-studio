<template>
  <div class="with-connection-type">
    <div class="form-group col">
      <label for="authenticationType">Authentication Method</label>
      <!-- need to take the value -->
      <select name="" @change="authType_onChange" id="">
        <option :value="undefined">Username / Password</option>
        <option :key="`${t.value}-${t.name}`" v-for="t in authTypes" :value="t.value">{{t.name}}
        </option>
      </select>
    </div>
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
    <div v-show="azureAuthEnabled" class="host-port-user-password">
      <div 
        class="form-group col" 
      >
        <div class="form-group">
          <label for="server">
            Server <i 
              class="material-icons"
              style="padding-left: 0.25rem"
              v-tooltip="{ 
                content: 'This is the <code>\'Server name\'</code> field on your Sql Server in Azure, <br/> you might also think of this as the hostname. <br/> Eg. <code>example.database.windows.net</code>', 
                html: true }"
            >help_outlined</i>
        </label>
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
          <label for="tenantId">            
            Tenant ID <i 
              class="material-icons"
              style="padding-left: 0.25rem"
              v-tooltip="{
                content: 'This can be found in the <code>\'Microsoft Entra ID\'</code> section of Azure, <br/> in the Overview labelled <code>\'Tenant ID\'</code>',
                html: true }"
            >help_outlined</i>
          </label>
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
            v-model="config.azureAuthOptions.clientSecret"
          >
        </div>
        <div class="form-group" v-show="showMsiEndpoint">
          <label for="msiEndpoint">MSI Endpoint</label>
          <input 
            name="msiEndpoint"
            type="text" 
            class="form-control" 
            v-model="config.azureAuthOptions.msiEndpoint"
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
        authType: AzureAuthType,
        authTypes: AzureAuthTypes
      }
    },
    computed: {
      showUser() {
        return [AzureAuthType.Password].includes(this.authType)
      },
      showPassword() {
        return [AzureAuthType.Password].includes(this.authType)
      },
      showTenantId() {
        return [AzureAuthType.Password, AzureAuthType.ServicePrincipalSecret]
          .includes(this.authType)
      },
      showClientSecret() {
        return [AzureAuthType.ServicePrincipalSecret].includes(this.authType)
      },
      showMsiEndpoint() {
        return [AzureAuthType.MSIVM].includes(this.authType)
      },
    },
    methods: {
      authType_onChange(event) {
        const value = event.target.value;

        //if (platformInfo.isCommunity) {
        //  this.$root.$emit(AppEvent.upgradeModal);
        //  this.azureAuthEnabled = false;

        //  return;
        //}
        if (value) {
          this.azureAuthEnabled = true;
          this.config.azureAuthOptions.azureAuthEnabled = true;
          this.config.azureAuthOptions.azureAuthType = this.authType = Number(value);
        } else {
          this.config.azureAuthOptions.azureAuthType = this.authType = undefined;
          this.azureAuthEnabled = false;
          this.config.azureAuthOptions.azureAuthEnabled = false;
        }
      }
    }
  }
</script>

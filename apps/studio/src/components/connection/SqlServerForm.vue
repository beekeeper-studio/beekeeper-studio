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
    <!-- I hate this, I feel like the rest of the form should be hidden if this is active -->
    <div class="advanced-connection-settings">
      <h4 
        class="advanced-heading flex"
        :class="{enabled: azureAuthEnabled}"
      >
        <span class="expand">Azure SSO Authentication</span>
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
          <label for="Server">Server</label>
          <input 
            type="text" 
            class="form-control" 
            v-model="config.host"
          >
        </div>
        <div class="form-group">
          <label for="Database">Database</label>
          <input 
            type="text" 
            class="form-control" 
            v-model="config.defaultDatabase"
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script>

  import CommonServerInputs from './CommonServerInputs'
  import CommonAdvanced from './CommonAdvanced'
  import { AzureAuthService } from '../../lib/db/authentication/azure'
  import { TokenCache } from '@/common/appdb/models/token_cache';

  export default {
    components: { CommonServerInputs, CommonAdvanced },
    props: ['config'],
    data() {
      return {
        azureAuthEnabled: this.config.azureAuthOptions?.azureAuthEnabled || false
      }
    },
    methods: {
      async toggleAzureAuth() {
        this.config.azureAuthOptions.azureAuthEnabled = this.azureAuthEnabled = !this.azureAuthEnabled;
      }
    }

  }
</script>

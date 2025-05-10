<template>
  <div v-show="azureAuthEnabled" class="host-port-user-password">
    <div class="alert alert-info">
      <i class="material-icons-outlined">info</i>
      <div>
        You are using azure authentication, depending on the authentication method you might need to configure some existing items first. Please refer to our <a href="https://docs.beekeeperstudio.io/user_guide/connecting/azure-entraid">Beekeeper Docs</a> for more information
      </div>
    </div>
    <div
      class="form-group col"
    >
      <div v-show="showCli" class="form-group">
        <label for="msiEndpoint">AZ Tool <i
          class="material-icons"
          style="padding-left: 0.25rem"
          v-tooltip="{
                content: 'You are signing in using the <code>\'Azure CLI\' Beekeeper Studio will attempt to use the AZ tool in path specified.</code>',
                html: true }"
        >help_outlined</i></label>
        <input
          name="msiEndpoint"
          type="text"
          class="form-control"
          v-model="config.azureAuthOptions.cliPath"
        >
      </div>
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
      <div class="advanced-connection-settings signed-in-as" v-if="hasAccessTokenCache">
        <div class="advanced-body">
          <span class="info">Signed in{{ accountName ? ` as ${accountName}` : '' }}</span>
          <button
            class="btn btn-flat btn-icon"
            type="button"
            @click.prevent="signOut"
            :disabled="signingOut"
          >
            <i class="material-icons">logout</i>
            Sign out
          </button>
        </div>
      </div>
      <div class="form-group" v-show="showUser">
        <label for="user">User</label>
        <input
          name="user"
          type="text"
          class="form-control"
          v-model="username"
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

</template>
<script>
import { AzureAuthType } from "@/lib/db/types";
import { AppEvent } from "@/common/AppEvent";
import _ from "lodash";
import { onMounted } from "vue";

export default {
  props: ['config', 'authType'],
  data() {
    return {
      azureAuthEnabled: this.config.azureAuthOptions?.azureAuthEnabled,
      accountName: null,
      signingOut: false,
      errorSigningOut: null,
    };
  },
  computed: {
    username: {
      get() {
        return this.config.username || this.config.user;
      },
      set(value) {
        this.config.username = value;
        this.config.user = value;
      }
    },
    showUser() {
      return [AzureAuthType.Password, AzureAuthType.CLI].includes(this.authType)
    },
    showPassword() {
      return [AzureAuthType.Password].includes(this.authType)
    },
    showTenantId() {
      return [AzureAuthType.Password, AzureAuthType.ServicePrincipalSecret].includes(this.authType)
    },
    showClientSecret() {
      return [AzureAuthType.ServicePrincipalSecret].includes(this.authType)
    },
    showMsiEndpoint() {
      return [AzureAuthType.MSIVM].includes(this.authType)
    },
    showCli() {
      return [AzureAuthType.CLI].includes(this.authType)
    },
    hasAccessTokenCache() {
      return Boolean(this.accountName)
    },
  },
  watch: {
    async authType() {
      const authId = this.config.azureAuthOptions?.authId || this.config?.authId
      if (this.authType === AzureAuthType.AccessToken && !_.isNil(authId)) {
        this.accountName = await this.connection.azureGetAccountName(authId);
      } else {
        this.accountName = null
      }
    },
    azureAuthEnabled() {
      this.config.azureAuthOptions.azureAuthEnabled = this.azureAuthEnabled
    }
  },
  methods: {
    toggleIAMAuthentication() {
      this.azureAuthEnabled = !this.azureAuthEnabled
      this.config.azureAuthOptions.azureAuthEnabled = this.azureAuthEnabled;
    },
    async signOut() {
      try {
        this.signingOut = true
        await this.connection.azureSignOut(this.config);
        this.config.authId = null
        this.accountName = null
      } catch (e) {
        this.errorSigningOut = e
        this.$emit('error', e)
      } finally {
        this.signingOut = false
      }
    },
    async tryFindAzCli() {
      if (!this.config.azureAuthOptions.cliPath) {
        try {
          const result = await window.main.rawInvoke('which-tool', 'az')
          if (result.success) {
            this.config.azureAuthOptions.cliPath = result.path;
          } else {
            this.config.azureAuthOptions.cliPath = 'NO CLI FOUND, PLEASE REFER TO DOCS'
          }
        } catch (e) {
          this.config.azureAuthOptions.cliPath = 'NO CLI FOUND, PLEASE REFER TO DOCS'
        }
      }
    }
  },
  mounted() {
    this.tryFindAzCli();
  }
}
</script>

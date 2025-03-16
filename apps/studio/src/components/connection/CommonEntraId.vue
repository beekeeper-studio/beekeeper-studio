<template>
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

import {AzureAuthType} from "@/lib/db/types";

export default {
  props: ['config', 'authType'],
  data() {
    return {
      azureAuthEnabled: this.config.azureAuthOptions?.azureAuthEnabled
    };
  },
  computed: {
    // isRedshift(){
    //   return this.config.connectionType === 'redshift'
    // },
    // isKeyAuth() {
    //   const { redshiftOptions } = this.config
    //   return redshiftOptions?.authType && redshiftOptions.authType.includes('key')
    // },
    // isProfileAuth() {
    //   const { redshiftOptions } = this.config
    //   return redshiftOptions?.authType && redshiftOptions.authType.includes('file')
    // }
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
      return [AzureAuthType.Password].includes(this.authType) || [AzureAuthType.CLI].includes(this.authType)
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
    hasAccessTokenCache() {
      return Boolean(this.accountName)
    },
  },
  methods: {
    toggleIAMAuthentication() {
      this.azureAuthEnabled = !this.azureAuthEnabled
      this.config.azureAuthOptions.azureAuthEnabled =
        this.azureAuthEnabled;
    }
  }
}
</script>

<template>
  <div v-show="azureAuthEnabled" class="host-port-user-password">
    <div class="alert alert-info">
      <i class="material-icons-outlined">info</i>
      <div v-if="showCli">
        You are signing in using the <b>'Azure CLI'</b> Beekeeper Studio will attempt to use the AZ tool in path specified.
        <a href="https://docs.beekeeperstudio.io/docs/sqlite#runtime-extensions">Learn more</a>
      </div>
      <div v-else>
        You are using azure authentication, depending on the authentication
        method you might need to configure some existing items first. Please
        refer to our
        <a
          href="https://docs.beekeeperstudio.io/user_guide/connecting/azure-entraid"
          >Beekeeper Docs</a
        >
        for more information
      </div>
    </div>
    <div class="form-group col">
      <div v-show="showCli" class="form-group">
        <label for="cliPath">
          Azure CLI Path (az)
          </label
        >
        <input
          name="cliPath"
          type="text"
          class="form-control"
          v-model="config.azureAuthOptions.cliPath"
        />
        <div class="alert alert-danger" v-show="!cliFound">
          <i class="material-icons-outlined">warning</i>
          <div>
            NO CLI FOUND, Please refer to our
            <a
              href="https://docs.beekeeperstudio.io/user_guide/connecting/azure-entraid"
              >Beekeeper Docs</a
            >
            for more information
          </div>
        </div>
      </div>
      <div class="form-group">
        <label for="server">
          Server
          <i
            class="material-icons"
            style="padding-left: 0.25rem"
            v-tooltip="{
              content:
                'This is the <code>\'Server name\'</code> field on your Sql Server in Azure, <br/> you might also think of this as the hostname. <br/> Eg. <code>example.database.windows.net</code>',
              html: true,
            }"
            >help_outlined</i
          >
        </label>
        <masked-input :value="config.host" :privacy-mode="privacyMode" @input="val => config.host = val" />
      </div>
      <div class="form-group">
        <label for="database">Database</label>
        <input
          name="database"
          type="text"
          class="form-control"
          v-model="config.defaultDatabase"
        />
      </div>
      <div
        class="advanced-connection-settings signed-in-as"
        v-if="hasAccessTokenCache"
      >
        <div class="advanced-body">
          <span class="info"
            >Signed in{{ accountName ? ` as ${privacyMode ? '*****' : accountName}` : "" }}</span
          >
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
      <div class="form-group" v-show="isServicePrincipal">
        <label for="tenantId">
          Tenant ID
          <i
            class="material-icons"
            style="padding-left: 0.25rem"
            v-tooltip="{
              content:
                'This can be found in the <code>\'Microsoft Entra ID\'</code> section of Azure, <br/> in the Overview labelled <code>\'Tenant ID\'</code>',
              html: true,
            }"
            >help_outlined</i
          >
        </label>
        <masked-input :value="config.azureAuthOptions.tenantId" :privacy-mode="privacyMode" @input="val => config.azureAuthOptions.tenantId = val" />
      </div>
      <div class="form-group" v-show="isServicePrincipal">
        <label for="clientId">Client ID</label>
        <masked-input :value="config.azureAuthOptions.clientId" :privacy-mode="privacyMode" @input="val => config.azureAuthOptions.clientId = val" />
      </div>
      <div class="row gutter">
        <div class="col s12 form-group" v-show="isServicePrincipal">
          <label for="clientSecret">Client Secret</label>
          <input
            :type="toggleClientSecretInputType"
            v-model="config.azureAuthOptions.clientSecret"
            class="password form-control"
          >
          <i
            @click.prevent="toggleClientSecret"
            class="material-icons password-icon"
          >{{ toggleClientSecretIcon }}</i>
        </div>
      </div>
      <div class="form-group" v-show="showMsiEndpoint">
        <label for="msiEndpoint">MSI Endpoint</label>
        <masked-input :value="config.azureAuthOptions.msiEndpoint" :privacy-mode="privacyMode" @input="val => config.azureAuthOptions.msiEndpoint = val" />
      </div>
    </div>
  </div>
</template>
<script>
import { AzureAuthType } from "@/lib/db/types";
import { AppEvent } from "@/common/AppEvent";
import _ from "lodash";
import MaskedInput from '@/components/MaskedInput.vue'
import { mapState } from 'vuex'

export default {
  props: ["config", "authType"],
  components: {
    MaskedInput,
  },
  data() {
    return {
      azureAuthEnabled: this.config.azureAuthOptions?.azureAuthEnabled,
      accountName: null,
      signingOut: false,
      errorSigningOut: null,
      showClientSecret: false,
      cliError: false
    };
  },
  computed: {
    ...mapState('settings', ['privacyMode']),
    ...mapState(['connection']),
    toggleClientSecretIcon() {
      return this.showClientSecret ? "visibility_off" : "visibility"
    },
    toggleClientSecretInputType() {
      return this.showClientSecret ? "text" : "password"
    },
    showUser() {
      return this.authType === AzureAuthType.CLI;
    },
    isServicePrincipal() {
      return this.authType === AzureAuthType.ServicePrincipalSecret;
    },
    showMsiEndpoint() {
      return this.authType === AzureAuthType.MSIVM;
    },
    showCli() {
      return this.authType === AzureAuthType.CLI;
    },
    hasAccessTokenCache() {
      return Boolean(this.accountName);
    },
    cliFound() {
      return !!this.config?.azureAuthOptions?.cliPath && !this.cliError;
    }
  },
  watch: {
    async authType() {
      const authId = this.config.azureAuthOptions?.authId || this.config?.authId;
      if (this.authType === AzureAuthType.AccessToken && !_.isNil(authId)) {
        this.accountName = await this.connection.azureGetAccountName(authId);
      } else {
        this.accountName = null;
      }
    },
    azureAuthEnabled() {
      this.config.azureAuthOptions.azureAuthEnabled = this.azureAuthEnabled;
    },
  },
  methods: {
    toggleIAMAuthentication() {
      this.azureAuthEnabled = !this.azureAuthEnabled;
      this.config.azureAuthOptions.azureAuthEnabled = this.azureAuthEnabled;
    },
    toggleClientSecret() {
      return this.showClientSecret = !this.showClientSecret
    },
    async signOut() {
      try {
        this.signingOut = true;
        await this.connection.azureSignOut(this.config);
        this.config.authId = null;
        this.accountName = null;
      } catch (e) {
        this.errorSigningOut = e;
        this.$emit("error", e);
      } finally {
        this.signingOut = false;
      }
    },
    async tryFindAzCli() {
      if (!this.config.azureAuthOptions.cliPath) {
        try {
          const result = await this.$util.send('backup/whichDumpTool', {toolName: "az"});
          if (result) {
            this.config.azureAuthOptions.cliPath = result;
            this.cliError = false;
          } else {
            this.config.azureAuthOptions.cliPath = null;
            this.cliError = true;
          }
        } catch (e) {
          this.config.azureAuthOptions.cliPath = null;
          this.cliError = true;
        }
      }
    },
  },
  mounted() {
    this.tryFindAzCli();
  },
};
</script>

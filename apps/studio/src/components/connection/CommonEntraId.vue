<template>
  <div v-show="azureAuthEnabled" class="host-port-user-password">
    <div class="alert alert-info">
      <i class="material-icons-outlined">info</i>
      <div v-if="showCli">
        You are signing in using the <b>'Azure CLI'</b> Beekeeper Studio will attempt to use the AZ tool in path specified.
        <a href="https://docs.beekeeperstudio.io/user_guide/connecting/azure-entraid/#azure-cli-authentication">Learn more</a>
      </div>
      <div v-else>
        You are using azure authentication, depending on the authentication
        method you might need to configure some existing items first. Please
        refer to our
        <a
          href="https://docs.beekeeperstudio.io/user_guide/connecting/azure-entraid"
        >Beekeeper Docs</a>
        for more information
      </div>
    </div>
    <div class="form-group col">
      <cli-path-picker
        v-show="showCli"
        tool-name="az"
        label="Azure CLI Path"
        docs-href="https://docs.beekeeperstudio.io/user_guide/connecting/azure-entraid"
        :value="config.azureAuthOptions.cliPath"
        @input="val => $set(config.azureAuthOptions, 'cliPath', val)"
      />
      <div class="form-group">
        <label for="server">
          Server
          <i
            class="material-icons"
            style="padding-left: 0.25rem"
            v-tooltip="{
              content:
                'This is the <code>\'Server name\'</code> field on your database in Azure, <br/> you might also think of this as the hostname. <br/> Eg. <code>example.database.windows.net</code>',
              html: true,
            }"
          >help_outlined</i>
        </label>
        <masked-input :value="config.host" @input="val => config.host = val" :disabled="disabled" />
      </div>
      <div class="form-group">
        <label for="database">Database</label>
        <input
          name="database"
          type="text"
          class="form-control"
          v-model="config.defaultDatabase"
          :disabled="disabled"
        >
      </div>
      <div
        class="advanced-connection-settings signed-in-as"
        v-if="hasAccessTokenCache"
      >
        <div class="advanced-body">
          <span class="info">Signed in{{ accountName ? ` as ${privacyMode ? '*****' : accountName}` : "" }}</span>
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
          v-model="config.username"
          :disabled="disabled"
        >
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
          >help_outlined</i>
        </label>
        <masked-input :value="config.azureAuthOptions.tenantId" @input="val => config.azureAuthOptions.tenantId = val" :disabled="disabled" />
      </div>
      <div class="form-group" v-show="isServicePrincipal">
        <label for="clientId">Client ID</label>
        <masked-input :value="config.azureAuthOptions.clientId" @input="val => config.azureAuthOptions.clientId = val" :disabled="disabled" />
      </div>
      <div class="row gutter">
        <div class="col s12 form-group" v-show="isServicePrincipal">
          <label for="clientSecret">Client Secret</label>
          <password-input v-model="config.azureAuthOptions.clientSecret" :disabled="disabled" />
        </div>
      </div>
      <div class="form-group" v-show="showMsiEndpoint">
        <label for="msiEndpoint">MSI Endpoint</label>
        <masked-input :value="config.azureAuthOptions.msiEndpoint" @input="val => config.azureAuthOptions.msiEndpoint = val" :disabled="disabled" />
      </div>
    </div>
  </div>
</template>
<script>
import { AzureAuthType } from "@/lib/db/types";
import { AppEvent } from "@/common/AppEvent";
import _ from "lodash";
import MaskedInput from '@/components/MaskedInput.vue'
import PasswordInput from '@/components/common/form/PasswordInput.vue'
import CommonSsl from './CommonSsl.vue'
import { mapState, mapGetters } from 'vuex'
import CliPathPicker from '@/components/common/form/CliPathPicker.vue'

export default {
  props: {
    config: Object,
    authType: [String, Number],
    sslHelp: String,
    supportComplexSSL: {
      type: Boolean,
      default: true
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  components: {
    MaskedInput,
    PasswordInput,
    CommonSsl,
    CliPathPicker
  },
  data() {
    return {
      azureAuthEnabled: this.config.azureAuthOptions?.azureAuthEnabled,
      accountName: null,
      signingOut: false,
      errorSigningOut: null,
    };
  },
  computed: {
    ...mapGetters('settings', ['privacyMode']),
    ...mapState(['connection']),
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
  },
};
</script>

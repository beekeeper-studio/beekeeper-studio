<template>
  <div class="with-connection-type sql-server-form">
    <div class="form-group col">
      <label for="authenticationType">{{ $t('connection.authenticationMethod') }}</label>
      <!-- need to take the value -->
      <select name="" v-model="authType" id="">
        <option value="default">
          {{ $t('connection.usernamePassword') }}
        </option>
        <option :key="`${t.value}-${t.name}`" v-for="t in authTypes" :value="t.value">
          {{ t.name }}
        </option>
      </select>
    </div>
    <common-server-inputs v-show="!azureAuthEnabled" :config="config">
      <div class="advanced-connection-settings">
        <h4 class="advanced-heading">
          {{ $t('connection.sqlserver.options') }}
        </h4>
        <div class="advanced-body">
          <div class="form-group">
            <label for="domain">
              {{ $t('connection.sqlserver.domain') }}
              <i
                class="material-icons"
                v-tooltip="$t('connection.sqlserver.domainTooltip')"
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
              {{ $t('connection.sqlserver.trustServerCertificate') }}
              <i
                class="material-icons"
                v-tooltip="$t('connection.sqlserver.trustServerCertificateTooltip')"
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
            {{ $t('connection.sqlserver.server') }} <i
              class="material-icons"
              style="padding-left: 0.25rem"
              v-tooltip="{
                content: $t('connection.sqlserver.serverTooltip'),
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
          <label for="database">{{ $t('connection.database') }}</label>
          <input
            name="database"
            type="text"
            class="form-control"
            v-model="config.defaultDatabase"
          >
        </div>
        <div class="advanced-connection-settings signed-in-as" v-if="hasAccessTokenCache">
          <div class="advanced-body">
            <span class="info">{{ accountName ? $t('connection.sqlserver.signedIn', {account: ` as ${accountName}`}) : $t('connection.sqlserver.signedIn', {account: ''}) }}</span>
            <button
              class="btn btn-flat btn-icon"
              type="button"
              @click.prevent="signOut"
              :disabled="signingOut"
            >
              <i class="material-icons">logout</i>
              {{ $t('connection.sqlserver.signOut') }}
            </button>
          </div>
        </div>
        <div class="form-group" v-show="showUser">
          <label for="user">{{ $t('connection.user') }}</label>
          <input
            name="user"
            type="text"
            class="form-control"
            v-model="config.username"
          >
        </div>
        <div class="form-group" v-show="showPassword">
          <label for="password">{{ $t('connection.password') }}</label>
          <input
            name="password"
            type="text"
            class="form-control"
            v-model="config.password"
          >
        </div>
        <div class="form-group" v-show="showTenantId">
          <label for="tenantId">
            {{ $t('connection.sqlserver.tenantId') }} <i
              class="material-icons"
              style="padding-left: 0.25rem"
              v-tooltip="{
                content: $t('connection.sqlserver.tenantIdTooltip'),
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
          <label for="clientSecret">{{ $t('connection.sqlserver.clientSecret') }}</label>
          <input
            name="clientSecret"
            type="text"
            class="form-control"
            v-model="config.azureAuthOptions.clientSecret"
          >
        </div>
        <div class="form-group" v-show="showMsiEndpoint">
          <label for="msiEndpoint">{{ $t('connection.sqlserver.msiEndpoint') }}</label>
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
  import CommonServerInputs from './CommonServerInputs.vue'
  import CommonAdvanced from './CommonAdvanced.vue'
  import { AzureAuthTypes, AzureAuthType } from '@/lib/db/types';
  import { AppEvent } from '@/common/AppEvent'
  import _ from 'lodash'
  import { mapState, mapGetters } from 'vuex'

  export default {
    components: { CommonServerInputs, CommonAdvanced },
    props: ['config'],
    mounted() {
      this.authType = this.config?.azureAuthOptions?.azureAuthType || 'default'
      this.azureAuthEnabled = this.config?.azureAuthOptions?.azureAuthEnabled || false
    },
    data() {
      return {
        azureAuthEnabled: false,
        authType: 'default',
        accountName: null,
        signingOut: false,
        errorSigningOut: null,
      }
    },
    watch: {
      async authType() {
        if (this.authType === 'default') {
          // this is good
          this.azureAuthEnabled = false
          this.config.azureAuthOptions.azureAuthType = undefined
        } else {
          if (this.$store.getters.isCommunity) {
            // we want to display a modal
            this.$root.$emit(AppEvent.upgradeModal, this.$t('upgrade.authenticationRequired'));
            this.authType = 'default'
          } else {
            this.azureAuthEnabled = true
            this.config.azureAuthOptions.azureAuthType = this.authType
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
      }
    },
    computed: {
      ...mapState(['connection']),
      authTypes() {
        return AzureAuthTypes.map(type => ({
          name: this.$t(type.nameKey || 'misc.app.name'),
          value: type.value
        }))
      },
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
      hasAccessTokenCache() {
        return Boolean(this.accountName)
      },
    },
    methods: {
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
    }
  }
</script>

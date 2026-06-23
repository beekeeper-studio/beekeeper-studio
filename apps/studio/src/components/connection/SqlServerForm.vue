<template>
  <div class="with-connection-type sql-server-form">
    <div class="form-group col">
      <label for="authenticationType">Authentication Method</label>
      <!-- need to take the value -->
      <select name="" v-model="authType" id="">
        <option value="default">
          Username / Password
        </option>
        <option value="windows">
          Windows / Kerberos (Integrated)
        </option>
        <option :key="`${t.value}-${t.name}`" v-for="t in authTypes" :value="t.value">
          {{ t.name }}
        </option>
      </select>
    </div>
    <div v-show="windowsAuthEnabled" class="alert alert-info">
      <i class="material-icons-outlined">info</i>
      <div>
        Integrated authentication uses the current OS login &mdash; no username or
        password. On Linux and macOS it also requires unixODBC, the Microsoft ODBC
        Driver 18 for SQL Server, and a valid Kerberos ticket (kinit).
        <a href="https://docs.beekeeperstudio.io/user_guide/connecting/sql-server/">Setup guide</a>
      </div>
    </div>
    <common-server-inputs v-show="!azureAuthEnabled" :config="config" :hide-credentials="windowsAuthEnabled">
      <div class="advanced-connection-settings">
        <h4 class="advanced-heading">
          SQL Server Options
        </h4>
        <div class="advanced-body">
          <div class="form-group" v-show="!windowsAuthEnabled">
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
    <common-entra-id v-show="azureAuthEnabled" :auth-type="authType" :config="config" />
    <common-advanced v-show="!azureAuthEnabled" :config="config" />
  </div>
</template>

<script>
  import CommonServerInputs from './CommonServerInputs.vue'
  import CommonAdvanced from './CommonAdvanced.vue'
  import { AzureAuthTypes, AzureAuthType } from '@/lib/db/types';
  import { AppEvent } from '@/common/AppEvent'
  import _ from 'lodash'
  import { mapState, mapGetters } from 'vuex'
  import CommonEntraId from "@/components/connection/CommonEntraId.vue";

  export default {
    components: {CommonEntraId, CommonServerInputs, CommonAdvanced },
    props: ['config'],
    mounted() {
      if (this.config?.windowsAuthEnabled) {
        this.authType = 'windows'
        this.windowsAuthEnabled = true
      } else {
        this.authType = this.config?.azureAuthOptions?.azureAuthType || 'default'
        this.azureAuthEnabled = this.config?.azureAuthOptions?.azureAuthEnabled || false
      }
    },
    data() {
      return {
        azureAuthEnabled: false,
        windowsAuthEnabled: false,
        authType: 'default',
        authTypes: AzureAuthTypes,
      }
    },
    watch: {
      async authType() {
        if (this.authType === 'default') {
          this.azureAuthEnabled = false
          this.windowsAuthEnabled = false
          this.config.windowsAuthEnabled = false
          this.config.azureAuthOptions.azureAuthType = undefined
          return
        }

        // Integrated (Windows/Kerberos) and Azure auth are both paid features.
        if (this.$store.getters.isCommunity) {
          this.$root.$emit(AppEvent.upgradeModal, "Enterprise Authentication");
          this.authType = 'default'
          return
        }

        if (this.authType === 'windows') {
          this.azureAuthEnabled = false
          this.windowsAuthEnabled = true
          this.config.windowsAuthEnabled = true
          this.config.azureAuthOptions.azureAuthType = undefined
        } else {
          this.azureAuthEnabled = true
          this.windowsAuthEnabled = false
          this.config.windowsAuthEnabled = false
          this.config.azureAuthOptions.azureAuthType = this.authType
        }
      },
      azureAuthEnabled() {
        this.config.azureAuthOptions.azureAuthEnabled = this.azureAuthEnabled
      },
      config() {
        if (this.config.windowsAuthEnabled) {
          this.authType = 'windows'
          this.windowsAuthEnabled = true
          this.azureAuthEnabled = false
        } else if (this.config.azureAuthOptions?.azureAuthEnabled) {
          this.authType = this.config.azureAuthOptions.azureAuthType
          this.windowsAuthEnabled = false
          this.azureAuthEnabled = true
        } else {
          this.authType = 'default'
          this.windowsAuthEnabled = false
          this.azureAuthEnabled = false
        }
      },
    },
    computed: {
      ...mapState(['connection']),
      showPassword() {
        return this.authType === AzureAuthType.Password;
      }
    }
  }
</script>

<template>
  <div class="with-connection-type">
    <div class="form-group col">
      <label for="authenticationType">Authentication Method</label>
      <!-- need to take the value -->
      <select name="" v-model="authType" id="">
        <option value="default">Username / Password</option>
        <option :key="`${t.value}-${t.name}`" v-for="t in authTypes" :value="t.value">{{t.name}}
        </option>
      </select>
    </div>
    <common-server-inputs v-show="!iamAuthenticationEnabled" :config="config" />

    <div v-show="iamAuthenticationEnabled" class="host-port-user-password">
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
        <div class="form-group">
          <label for="database">Port</label>
          <input
            type="number"
            class="form-control"
            name="port"
            v-model.number="config.port"
          >
        </div>
        <div class="form-group">
          <label for="user">User</label>
          <input
            name="user"
            type="text"
            class="form-control"
            v-model="config.username"
          >
        </div>
      </div>
    </div>

    <div class="form-group" v-if="isCockroach">
      <label for="Cluster ID">
        CockroachDB Cloud Cluster ID
        <i
          class="material-icons"
          v-tooltip="`Go to CockroachDB online -> Connect -> parameters only -> copy from 'options'`"
        >help_outlined</i>
      </label>
      <input
        type="text"
        class="form-control"
        v-model="config.options.cluster"
      />
    </div>
    <common-advanced :config="config" />

    <common-iam v-show="iamAuthenticationEnabled" :config="config" />
  </div>
</template>

<script>

  import CommonServerInputs from './CommonServerInputs.vue'
  import CommonAdvanced from './CommonAdvanced.vue'
  import CommonIam from './CommonIam.vue'
  import {AppEvent} from "@/common/AppEvent";
  import {AzureAuthType, AzureAuthTypes, IamAuthTypes} from "@/lib/db/types";
  import _ from "lodash";

  export default {
    components: { CommonServerInputs, CommonAdvanced, CommonIam },
    props: ['config'],
    data() {
      return {
        iamAuthenticationEnabled: false,
        authType: 'default',
        authTypes: IamAuthTypes,
        accountName: null,
        signingOut: false,
        errorSigningOut: null,
      }
    },
    watch: {
      async authType() {
        if (this.authType === 'default') {
          this.iamAuthenticationEnabled = false
        } else {
          if (this.$config.isCommunity) {
            // we want to display a modal
            this.$root.$emit(AppEvent.upgradeModal);
            this.authType = 'default'
          } else {
            this.iamAuthenticationEnabled = true
          }
        }

        const authId = this.config.azureAuthOptions?.authId || this.config?.authId
        if (this.authType === AzureAuthType.AccessToken && !_.isNil(authId)) {
          this.accountName = await this.connection.azureGetAccountName(authId);
        } else {
          this.accountName = null
        }
      },
      iamAuthenticationEnabled() {
        this.config.redshiftOptions.iamAuthenticationEnabled = this.iamAuthenticationEnabled
      }
    },
    computed: {
      isCockroach() {
        return this.config.connectionType === 'cockroachdb'
      },
    }
  };
</script>

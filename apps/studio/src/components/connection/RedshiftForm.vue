<template>
  <div class="with-connection-type">
    <common-server-inputs :config="config" />

    <div class="advanced-connection-settings">
      <h4
        class="advanced-heading flex"
        :class="{enabled: iamAuthenticationEnabled}"
      >
        <span class="expand">IAM Authentication</span>
        <x-switch
          @click.prevent="toggleIAMAuthentication"
          :toggled="iamAuthenticationEnabled"
        />
      </h4>
      <div
        class="advanced-body"
        v-show="iamAuthenticationEnabled"
      >
        <div class="row gutter">
          <div class="alert alert-info">
            <i class="material-icons-outlined">info</i>
            <div>Use AWS IAM authentication to connect with temporary cluster credentials. <a href="https://docs.aws.amazon.com/redshift/latest/mgmt/generating-user-credentials.html">Read More</a></div>
          </div>
        </div>

        <div class="form-group">
          <label for="AWS Region">
            AWS Region
          </label>
          <input
            type="text"
            class="form-control"
            v-model="config.redshiftOptions.awsRegion"
          >
        </div>
        <div class="form-group">
          <label for="Access Key ID">
            Access Key ID
          </label>
          <input
            type="text"
            class="form-control"
            v-model="config.redshiftOptions.accessKeyId"
          >
        </div>
        <div class="form-group">
          <label for="Secret Access Key">
            Secret Access Key
          </label>
          <input
            type="password"
            class="form-control"
            v-model="config.redshiftOptions.secretAccessKey"
          >
        </div>
        <div class="form-group">
          <label for="Cluster Identifier">Cluster Identifier</label>
          <input
            type="text"
            class="form-control"
            v-model="config.redshiftOptions.clusterIdentifier"
          >
        </div>
        <div class="form-group">
          <label for="Database Group">Database Group <span class="hint">(optional)</span></label>
          <input
            type="text"
            class="form-control"
            v-model="config.redshiftOptions.databaseGroup"
          >
        </div>
        <div class="form-group">
          <label for="Token Duration">Token Duration <span class="hint">(optional, in seconds)</span></label>
          <input
            type="text"
            class="form-control"
            v-model="config.redshiftOptions.tokenDurationSeconds"
          >
        </div>
      </div>
    </div>

    <common-advanced :config="config" />
  </div>
</template>
<script>

  import CommonServerInputs from './CommonServerInputs.vue'
  import CommonAdvanced from './CommonAdvanced.vue'

  export default {
    components: { CommonServerInputs, CommonAdvanced },
    data() {
      return {
        iamAuthenticationEnabled: this.config.redshiftOptions?.iamAuthenticationEnabled || false
      }
    },
    methods: {
      toggleIAMAuthentication() {
        this.config.redshiftOptions.iamAuthenticationEnabled = this.iamAuthenticationEnabled = !this.iamAuthenticationEnabled
      }
    },
    props: ['config'],
  }
</script>

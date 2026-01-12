<template>
  <div class="advanced-connection-settings">
    <h4
      class="advanced-heading flex"
    >
      <span class="expand">{{ $t('IAM Authentication') }}</span>
    </h4>
    <div class="advanced-body">
      <div class="row gutter">
        <div class="alert alert-info">
          <i class="material-icons-outlined">info</i>
          <div>
            {{ $t('Use AWS IAM authentication using credential file to connect with temporary cluster credentials.') }}
            <a
              href="https://docs.aws.amazon.com/redshift/latest/mgmt/generating-user-credentials.html"
            >{{ $t('Amazon Docs') }}</a> - <a href="https://docs.beekeeperstudio.io/user_guide/connecting/amazon-rdb">{{ $t('Beekeeper Docs') }}</a>
          </div>
        </div>
      </div>
      <div v-show="isRedshift" class="flex flex-middle mb-3">
        <h4
          class="advanced-heading flex"
          :class="{enabled: config.redshiftOptions.isServerless}"
        >
          <span class="expand">{{ $t('Is Serverless Instance') }}</span>
          <x-switch
            @click.prevent="toggleServerless"
            :toggled="config.redshiftOptions.isServerless"
          />
        </h4>
      </div>
      <div v-show="isProfileAuth" class="form-group">
        <label for="awsProfile"> {{ $t('AWS Profile') }} </label>
        <input
          name="awsProfile"
          type="text"
          class="form-control"
          v-model="config.redshiftOptions.awsProfile"
        >
      </div>
      <div v-show="isKeyAuth" >
        <div class="form-group">
          <label for="Access Key ID">
            {{ $t('Access Key ID') }}
          </label>
          <input
            type="text"
            class="form-control"
            v-model="config.redshiftOptions.accessKeyId"
          >
        </div>
        <div class="form-group">
          <label for="Secret Access Key">
            {{ $t('Secret Access Key') }}
          </label>
          <input
            type="password"
            class="form-control"
            v-model="config.redshiftOptions.secretAccessKey"
          >
        </div>
      </div>
      <div class="form-group">
        <label for="AWS Region">
          {{ $t('AWS Region') }}
        </label>
        <input
          type="text"
          class="form-control"
          v-model="config.redshiftOptions.awsRegion"
        >
      </div>
      <div v-show="isRedshift">
        <div class="form-group">
          <label for="Cluster Identifier">{{ $t('Cluster Identifier or Workgroup Name') }}</label>
          <input
            type="text"
            class="form-control"
            v-model="config.redshiftOptions.clusterIdentifier"
          >
        </div>
        <div class="form-group">
          <label for="Database Group">{{ $t('Database Group') }} <span class="hint">({{ $t('optional') }})</span></label>
          <input
            type="text"
            class="form-control"
            v-model="config.redshiftOptions.databaseGroup"
          >
        </div>
        <div class="form-group">
          <label for="Token Duration">{{ $t('Token Duration') }} <span class="hint">({{ $t('optional, in seconds') }})</span></label>
          <input
            type="text"
            class="form-control"
            v-model="config.redshiftOptions.tokenDurationSeconds"
          >
        </div>
      </div>
    </div>
  </div>
</template>
<script>

export default {
  props: ['config', 'authType'],
  data() {
    return {
      iamAuthenticationEnabled: this.config.redshiftOptions?.iamAuthenticationEnabled,
      isServerless: this.config.redshiftOptions?.isServerless
    };
  },
  computed: {
    isRedshift(){
      return this.config.connectionType === 'redshift'
    },
    isKeyAuth() {
      return this.authType === 'iam_key';
    },
    isProfileAuth() {
      return this.authType === 'iam_file';
    }
  },
  methods: {
    toggleIAMAuthentication() {
      this.iamAuthenticationEnabled = !this.iamAuthenticationEnabled
      this.config.redshiftOptions.iamAuthenticationEnabled =
        this.iamAuthenticationEnabled;
    },
    toggleServerless() {
      this.config.redshiftOptions.isServerless = !this.config.redshiftOptions.isServerless
    },
  }
}
</script>

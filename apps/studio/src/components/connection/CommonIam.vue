<template>
  <div class="advanced-connection-settings">
    <h4
      class="advanced-heading flex"
    >
      <span class="expand">{{ $t('connection.redshift.iamAuthentication') }}</span>
    </h4>
    <div class="advanced-body">
      <div class="row gutter">
        <div class="alert alert-info">
          <i class="material-icons-outlined">info</i>
          <div>
            {{ $t('connection.redshift.iamAuthHelpText') }}
            <a
              href="https://docs.aws.amazon.com/redshift/latest/mgmt/generating-user-credentials.html"
            >Amazon Docs</a> - <a href="https://docs.beekeeperstudio.io/user_guide/connecting/amazon-rdb">Beekeeper Docs</a>
          </div>
        </div>
      </div>
      <div v-show="isRedshift" class="flex flex-middle mb-3">
        <h4
          class="advanced-heading flex"
          :class="{enabled: config.redshiftOptions.isServerless}"
        >
          <span class="expand">{{ $t('connection.redshift.isServerless') }}</span>
          <x-switch
            @click.prevent="toggleServerless"
            :toggled="config.redshiftOptions.isServerless"
          />
        </h4>
      </div>
      <div v-show="isProfileAuth" class="form-group">
        <label for="awsProfile">{{ $t('connection.redshift.profile') }}</label>
        <input
          name="awsProfile"
          type="text"
          class="form-control"
          v-model="config.redshiftOptions.awsProfile"
        >
      </div>
      <template v-show="isKeyAuth">
        <div class="form-group">
          <label for="Access Key ID">
            {{ $t('connection.redshift.accessKeyId') }}
          </label>
          <input
            type="text"
            class="form-control"
            v-model="config.redshiftOptions.accessKeyId"
          >
        </div>
        <div class="form-group">
          <label for="Secret Access Key">
            {{ $t('connection.redshift.secretAccessKey') }}
          </label>
          <input
            type="password"
            class="form-control"
            v-model="config.redshiftOptions.secretAccessKey"
          >
        </div>
      </template>
      <div class="form-group">
        <label for="AWS Region">
          {{ $t('connection.redshift.region') }}
        </label>
        <input
          type="text"
          class="form-control"
          v-model="config.redshiftOptions.awsRegion"
        >
      </div>
      <template v-show="isRedshift">
        <div class="form-group">
          <label for="Cluster Identifier">{{ $t('connection.redshift.clusterIdentifierOrWorkgroup') }}</label>
          <input
            type="text"
            class="form-control"
            v-model="config.redshiftOptions.clusterIdentifier"
          >
        </div>
        <div class="form-group">
          <label for="Database Group">{{ $t('connection.redshift.databaseGroup') }} <span class="hint">({{ $t('connection.optional') }})</span></label>
          <input
            type="text"
            class="form-control"
            v-model="config.redshiftOptions.databaseGroup"
          >
        </div>
        <div class="form-group">
          <label for="Token Duration">{{ $t('connection.redshift.tokenDuration') }} <span class="hint">({{ $t('connection.redshift.secondsOptional') }})</span></label>
          <input
            type="text"
            class="form-control"
            v-model="config.redshiftOptions.tokenDurationSeconds"
          >
        </div>
      </template>
    </div>
  </div>
</template>
<script>

export default {
  props: ['config'],
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
      const { redshiftOptions } = this.config
      return redshiftOptions?.authType && redshiftOptions.authType.includes('key')
    },
    isProfileAuth() {
      const { redshiftOptions } = this.config
      return redshiftOptions?.authType && redshiftOptions.authType.includes('file')
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

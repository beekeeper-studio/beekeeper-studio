<template>
  <div class="advanced-connection-settings">
    <h4
      class="advanced-heading flex"
    >
      <span class="expand">IAM Authentication</span>

    </h4>
    <div class="advanced-body">
      <div class="row gutter">
        <div class="alert alert-info">
          <i class="material-icons-outlined">info</i>
          <div>
            Use AWS IAM authentication using credential file to connect with temporary cluster
            credentials.
            <a
              href="https://docs.aws.amazon.com/redshift/latest/mgmt/generating-user-credentials.html"
            >Amazon Docs</a
            > - <a href="https://https://docs.beekeeperstudio.io//user_guide/connecting/amazon-rdb">Beekeeper Docs</a>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label for="awsRegion"> AWS Region </label>
        <input
          name="awsRegion"
          type="text"
          class="form-control"
          v-model="config.redshiftOptions.awsRegion"
        />
      </div>
      <div class="form-group">
        <label for="awsProfile"> AWS Profile </label>
        <input
          name="awsProfile"
          type="text"
          class="form-control"
          v-model="config.redshiftOptions.awsProfile"
        />
      </div>
    </div>
  </div>
</template>
<script>

export default {
  props: ['config'],
  data() {
    return {
      iamAuthenticationEnabled:
      this.config.redshiftOptions?.iamAuthenticationEnabled,
    };
  },
  methods: {
    toggleIAMAuthentication() {
      this.iamAuthenticationEnabled = !this.iamAuthenticationEnabled
      this.config.redshiftOptions.iamAuthenticationEnabled =
        this.iamAuthenticationEnabled;
    },
  }
}
</script>

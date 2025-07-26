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
            >Amazon Docs</a> - <a href="https://docs.beekeeperstudio.io/user_guide/connecting/amazon-rds">Beekeeper Docs</a>
          </div>
        </div>
      </div>
      <div class="form-group col">
        <div v-show="showCli" class="form-group">
          <label for="cliPath">AWS Tool
            <i
              class="material-icons"
              style="padding-left: 0.25rem"
              v-tooltip="{
                content:
                  'You are signing in using the <code>\'AWS CLI\' Beekeeper Studio will attempt to use the AWS CLI tool in path specified.</code>',
                html: true,
              }">help_outlined</i></label>
          <div class="alert alert-danger" v-show="!config.azureAuthOptions.cliPath">
            <i class="material-icons-outlined">warning</i>
            <div>
              NO CLI FOUND, Please refer to our
              <a href="https://docs.beekeeperstudio.io/user_guide/connecting/amazon-rds">Beekeeper Docs</a>
              for more information
            </div>
          </div>
          <input name="cliPath" type="text" class="form-control" v-model="config.redshiftOptions.cliPath" />
        </div>
      </div>
      <div v-show="isRedshift" class="flex flex-middle mb-3">
        <h4
          class="advanced-heading flex"
          :class="{enabled: config.redshiftOptions.isServerless}"
        >
          <span class="expand">Is Serverless Instance</span>
          <x-switch
            @click.prevent="toggleServerless"
            :toggled="config.redshiftOptions.isServerless"
          />
        </h4>
      </div>
      <div v-show="isProfileAuth" class="form-group">
        <label for="awsProfile"> AWS Profile </label>
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
      <div v-show="isRedshift">
        <div class="form-group">
          <label for="Cluster Identifier">Cluster Identifier or Workgroup Name</label>
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
    showCli() {
      return this.authType === 'iam_cli';
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
    async tryFindAWSCli() {
      if (!this.config.redshiftOptions.cliPath) {
        try {
          const result = await window.main.whichTool("aws");
          if (result.success) {
            this.config.redshiftOptions.cliPath = result.path;
          } else {
            this.config.redshiftOptions.cliPath = null;
          }
        } catch (e) {
          this.config.redshiftOptions.cliPath = null;
        }
      }
    },
  },
  mounted() {
    this.tryFindAWSCli();
  },
}
</script>

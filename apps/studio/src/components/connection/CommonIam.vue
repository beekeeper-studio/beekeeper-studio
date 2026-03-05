<template>
  <div class="advanced-connection-settings">
    <h4 class="advanced-heading flex">
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

      <div class="form-group col" v-show="showCli">
        <div class="form-group">
          <label for="cliPath">AWS CLI Path
            <i
              class="material-icons"
              style="padding-left: 0.25rem"
              v-tooltip="{
                content:
                  'You are signing in using the <code>AWS CLI</code>. Beekeeper Studio will attempt to use the AWS CLI tool at the specified path.',
                html: true,
              }">help_outlined</i>
          </label>

          <div class="alert alert-danger" v-show="!cliFound">
            <i class="material-icons-outlined">warning</i>
            <div>
              NO CLI FOUND, Please refer to our
              <a href="https://docs.beekeeperstudio.io/user_guide/connecting/amazon-rds">Beekeeper Docs</a>
              for more information
            </div>
          </div>

          <file-picker v-model="cliPath"/>
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

      <!-- PROFILE SELECT or TEXTBOX (fallback) -->
      <div v-show="isProfileAuth" class="form-group">
        <label>AWS Profile</label>

        <!-- Use SELECT only if we have a non-empty string[] of profiles -->
        <select
          v-if="hasProfiles"
          class="form-control"
          v-model="config.iamAuthOptions.awsProfile"
        >
          <option
            v-for="option in config.iamAuthOptions.profiles"
            :key="option"
            :value="option"
          >
            {{ option }}
          </option>
        </select>
        <!-- Fallback to TEXTBOX if no profiles found or CLI not set -->
        <input
          v-else
          type="text"
          class="form-control"
          placeholder="Enter AWS profile name (e.g., default, dev, prod)"
          v-model="config.iamAuthOptions.awsProfile"
        />
      </div>

      <div v-show="isKeyAuth">
        <div class="form-group">
          <label for="Access Key ID">Access Key ID</label>
          <masked-input :value="config.iamAuthOptions.accessKeyId" :privacy-mode="privacyMode" @input="val => config.iamAuthOptions.accessKeyId = val" :type="'password'" />
        </div>
        <div class="form-group">
          <label for="Secret Access Key">Secret Access Key</label>
          <masked-input :value="config.iamAuthOptions.secretAccessKey" :privacy-mode="privacyMode" @input="val => config.iamAuthOptions.secretAccessKey = val" :type="'password'" />
        </div>
      </div>

      <div class="form-group">
        <label for="AWS Region">AWS Region</label>
        <masked-input :value="config.iamAuthOptions.awsRegion" :privacy-mode="privacyMode" @input="val => config.iamAuthOptions.awsRegion = val" />
      </div>

      <div v-show="isRedshift">
        <div class="form-group">
          <label for="Cluster Identifier">Cluster Identifier or Workgroup Name</label>
          <masked-input :value="config.redshiftOptions.clusterIdentifier" :privacy-mode="privacyMode" @input="val => config.redshiftOptions.clusterIdentifier = val" :type="'password'" />
        </div>
        <div class="form-group">
          <label for="Database Group">Database Group <span class="hint">(optional)</span></label>
          <input type="text" class="form-control" v-model="config.redshiftOptions.databaseGroup">
        </div>
        <div class="form-group">
          <label for="Token Duration">Token Duration <span class="hint">(optional, in seconds)</span></label>
          <input type="text" class="form-control" v-model="config.redshiftOptions.tokenDurationSeconds">
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import MaskedInput from '@/components/MaskedInput.vue'
  import FilePicker from '@/components/common/form/FilePicker.vue'
import { mapState } from 'vuex'

export default {
  props: ['config', 'authType'],
  components: {
    MaskedInput,
    FilePicker
  },
  data() {
    return {
      iamAuthenticationEnabled: this.config.iamAuthOptions?.iamAuthenticationEnabled,
      isServerless: this.config.redshiftOptions?.isServerless,
      cliError: false,
      profilesError: false,
    };
  },
  computed: {
    ...mapState('settings', ['privacyMode']),
    isRedshift() {
      return this.config.connectionType === 'redshift';
    },
    showCli() {
      return this.authType === 'iam_cli';
    },
    isKeyAuth() {
      return this.authType === 'iam_key';
    },
    isProfileAuth() {
      return ['iam_cli', 'iam_file'].includes(this.authType);
    },
    cliFound() {
      return !!this.config.iamAuthOptions?.cliPath && !this.cliError;
    },
    hasProfiles() {
      const p = this.config.iamAuthOptions?.profiles;
      return Array.isArray(p) && p.length > 0 && !this.profilesError;
    },
    cliPath: {
      get() {
        return this.config.iamAuthOptions?.cliPath;
      },
      set(value) {
        this.config.iamAuthOptions.cliPath = value;
      },
    },
  },
  methods: {
    toggleIAMAuthentication() {
      this.iamAuthenticationEnabled = !this.iamAuthenticationEnabled;
      this.$set(this.config.iamAuthOptions, 'iamAuthenticationEnabled', this.iamAuthenticationEnabled);
    },
    toggleServerless() {
      this.$set(this.config.redshiftOptions, 'isServerless', !this.config.redshiftOptions.isServerless);
    },

    async tryFindAWSCli() {
      try {
        const result = await this.$util.send('backup/whichDumpTool', { toolName: 'aws' });
        if (result) {
          this.$set(this.config.iamAuthOptions, 'cliPath', result);
          this.cliError = false;
          return result;
        } else {
          this.$set(this.config.iamAuthOptions, 'cliPath', null);
          this.cliError = true;
          return null;
        }
      } catch (e) {
        this.$set(this.config.iamAuthOptions, 'cliPath', null);
        this.cliError = true;
        return null;
      }
    },

    async tryFindAWSProfiles(cliPath) {
      try {
        if (!cliPath) {
          this.$set(this.config.iamAuthOptions, 'profiles', null);
          this.profilesError = true;
          return;
        }

        const result = await this.$util.send('aws/getProfiles', { toolName: cliPath });

        if (Array.isArray(result) && result.length > 0) {
          const unique = Array.from(new Set(result.map(String)));
          this.$set(this.config.iamAuthOptions, 'profiles', unique);
          this.profilesError = false;

          if (!this.config.iamAuthOptions.awsProfile) {
            this.$set(this.config.iamAuthOptions, 'awsProfile', unique[0]);
          }
        } else {
          this.$set(this.config.iamAuthOptions, 'profiles', null);
          this.profilesError = true;
        }
      } catch (e) {
        this.$set(this.config.iamAuthOptions, 'profiles', null);
        this.profilesError = true;
      }
    },
  },
  async mounted() {
    const cliPath = await this.tryFindAWSCli();
    await this.tryFindAWSProfiles(cliPath);
  },
};
</script>

<template>
  <div class="advanced-connection-settings">
    <h4 class="advanced-heading flex">
      <span class="expand">IAM Authentication</span>
    </h4>
    <div class="advanced-body">
      <div class="row">
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

      <cli-path-picker
        v-show="showCli"
        tool-name="aws"
        label="AWS CLI Path"
        docs-href="https://docs.beekeeperstudio.io/user_guide/connecting/amazon-rds"
        help-tooltip="You are signing in using the <code>AWS CLI</code>. Beekeeper Studio will attempt to use the AWS CLI tool at the specified path."
        :value="cliPath"
        @input="val => $set(config.iamAuthOptions, 'cliPath', val)"
      />

      <div v-show="isRedshift" class="flex flex-middle mb-3">
        <h4
          class="advanced-heading flex"
          :class="{enabled: config.redshiftOptions.isServerless}"
        >
          <span class="expand">Is Serverless Instance</span>
          <x-switch
            @click.prevent="toggleServerless"
            :toggled="config.redshiftOptions.isServerless"
            :disabled="disabled"
          />
        </h4>
      </div>

      <!-- PROFILE SELECT or TEXTBOX (fallback) -->
      <div v-show="isProfileAuth" class="form-group">
        <label>AWS Profile</label>

        <div class="alert alert-warning alert-centered" v-show="profilesError">
          <i class="material-icons">error_outline</i>
          <div>
            Unable to list AWS profiles from the selected CLI. Check it's installed
            and up to date, or enter a profile name manually.
          </div>
        </div>


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
        >
      </div>

      <div v-show="isKeyAuth">
        <div class="form-group">
          <label for="Access Key ID">Access Key ID</label>
          <masked-input :value="config.iamAuthOptions.accessKeyId" @input="val => config.iamAuthOptions.accessKeyId = val" :type="'password'" />
        </div>
        <div class="form-group">
          <label for="Secret Access Key">Secret Access Key</label>
          <masked-input :value="config.iamAuthOptions.secretAccessKey" @input="val => config.iamAuthOptions.secretAccessKey = val" :type="'password'" />
        </div>
      </div>

      <div class="form-group">
        <label for="AWS Region">AWS Region</label>
        <masked-input :value="config.iamAuthOptions.awsRegion" @input="val => config.iamAuthOptions.awsRegion = val" :disabled="disabled" />
      </div>

      <div v-show="isRedshift">
        <div class="form-group">
          <label for="Cluster Identifier">Cluster Identifier or Workgroup Name</label>
          <masked-input :value="config.redshiftOptions.clusterIdentifier" @input="val => config.redshiftOptions.clusterIdentifier = val" :type="'password'" :disabled="disabled" />
        </div>
        <div class="form-group">
          <label for="Database Group">Database Group <span class="hint">(optional)</span></label>
          <input type="text" class="form-control" v-model="config.redshiftOptions.databaseGroup" :disabled="disabled">
        </div>
        <div class="form-group">
          <label for="Token Duration">Token Duration <span class="hint">(optional, in seconds)</span></label>
          <input type="text" class="form-control" v-model="config.redshiftOptions.tokenDurationSeconds" :disabled="disabled">
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import MaskedInput from '@/components/MaskedInput.vue'
import CliPathPicker from '@/components/common/form/CliPathPicker.vue'

export default {
  props: {
    config: Object,
    authType: [String, Number],
    disabled: {
      type: Boolean,
      default: false
    }
  },
  components: {
    MaskedInput,
    CliPathPicker
  },
  data() {
    return {
      iamAuthenticationEnabled: this.config.iamAuthOptions?.iamAuthenticationEnabled,
      isServerless: this.config.redshiftOptions?.isServerless,
      profilesError: false,
    };
  },
  computed: {
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
    hasProfiles() {
      const p = this.config.iamAuthOptions?.profiles;
      return Array.isArray(p) && p.length > 0;
    },
    // Read-only getter; writes go through $set in the template to keep Vue 2
    // reactivity working when cliPath is being added to iamAuthOptions for
    // the first time (defaults to `{}`).
    cliPath() {
      return this.config.iamAuthOptions?.cliPath;
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

    async tryFindAWSProfiles(cliPath) {
      // No CLI selected yet — nothing to discover, and not an error.
      if (!cliPath) {
        this.$set(this.config.iamAuthOptions, 'profiles', null);
        this.profilesError = false;
        return;
      }

      try {
        const result = await this.$util.send('aws/getProfiles', { cliPath });

        // aws/getProfiles spawns a subprocess; if cliPath changed during the
        // await, this result corresponds to a path we no longer care about —
        // drop it so it can't overwrite a fresher fetch.
        if (this.cliPath !== cliPath) return;

        const profiles = Array.isArray(result)
          ? Array.from(new Set(result.map(String).map((s) => s.trim()).filter(Boolean)))
          : [];

        // The CLI ran successfully; clear any prior failure flag.
        this.profilesError = false;

        if (profiles.length > 0) {
          this.$set(this.config.iamAuthOptions, 'profiles', profiles);
          if (!this.config.iamAuthOptions.awsProfile) {
            this.$set(this.config.iamAuthOptions, 'awsProfile', profiles[0]);
          }
        } else {
          // CLI ran but reported no profiles — fall back to manual entry, no warning.
          this.$set(this.config.iamAuthOptions, 'profiles', null);
        }
      } catch (e) {
        if (this.cliPath !== cliPath) return;
        // The CLI invocation failed (missing / too old / broken). Surface it —
        // the form still falls back to the manual profile input.
        this.$set(this.config.iamAuthOptions, 'profiles', null);
        this.profilesError = true;
      }
    },
  },
  watch: {
    // Refetch AWS profiles whenever cliPath changes, regardless of source
    // (CliPathPicker auto-discovery, the Find action, a manual file pick, or
    // late hydration). immediate: true covers the saved-from-prior-session
    // case that the old mounted() hook handled.
    cliPath: {
      immediate: true,
      handler(newPath) {
        this.tryFindAWSProfiles(newPath);
      },
    },
  },
};
</script>

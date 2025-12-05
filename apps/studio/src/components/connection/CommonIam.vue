<template>
  <div class="advanced-connection-settings">
    <h4
      class="advanced-heading flex"
    >
      <span class="expand">{{ isSsoAuth ? 'AWS SSO / Identity Center' : 'IAM Authentication' }}</span>
    </h4>
    <div class="advanced-body">
      <!-- Info alert -->
      <div class="row gutter">
        <div class="alert alert-info">
          <i class="material-icons-outlined">info</i>
          <div v-if="isSsoAuth">
            Use AWS SSO / Identity Center to authenticate. When connecting, a browser window will
            open for you to sign in.
            <a
              href="https://docs.aws.amazon.com/singlesignon/latest/userguide/what-is.html"
            >AWS Docs</a>
          </div>
          <div v-else>
            Use AWS IAM authentication using credential file to connect with temporary cluster
            credentials.
            <a
              href="https://docs.aws.amazon.com/redshift/latest/mgmt/generating-user-credentials.html"
            >Amazon Docs</a> - <a href="https://docs.beekeeperstudio.io/user_guide/connecting/amazon-rdb">Beekeeper Docs</a>
          </div>
        </div>
      </div>

      <!-- SSO Profile Selection -->
      <div v-show="isSsoAuth">
        <div class="form-group" v-if="ssoProfiles.length > 0">
          <label for="ssoProfile">
            SSO Profile
            <i
              class="material-icons"
              v-tooltip="'Select an SSO profile from your ~/.aws/config file, or choose Custom to enter details manually'"
            >help_outlined</i>
          </label>
          <select
            name="ssoProfile"
            v-model="selectedProfile"
            class="form-control"
          >
            <option value="">-- Select a profile or enter custom --</option>
            <option
              v-for="profile in ssoProfiles"
              :key="profile.name"
              :value="profile.name"
            >
              {{ profile.name }} ({{ profile.ssoStartUrl }})
            </option>
            <option value="__custom__">Custom (enter manually)</option>
          </select>
        </div>

        <!-- Custom SSO Configuration -->
        <div v-show="showCustomSsoConfig">
          <div class="form-group">
            <label for="ssoStartUrl">
              SSO Start URL
              <i
                class="material-icons"
                v-tooltip="'Your AWS access portal URL, e.g., https://mycompany.awsapps.com/start'"
              >help_outlined</i>
            </label>
            <input
              name="ssoStartUrl"
              type="text"
              class="form-control"
              v-model="config.redshiftOptions.ssoStartUrl"
              placeholder="https://mycompany.awsapps.com/start"
            >
          </div>

          <div class="form-group">
            <label for="ssoRegion">
              SSO Region
              <i
                class="material-icons"
                v-tooltip="'The AWS region where your Identity Center is configured'"
              >help_outlined</i>
            </label>
            <input
              name="ssoRegion"
              type="text"
              class="form-control"
              v-model="config.redshiftOptions.ssoRegion"
              placeholder="us-east-1"
            >
          </div>
        </div>

        <!-- Account and Role (for SSO) -->
        <div class="form-group">
          <label for="ssoAccountId">
            AWS Account ID
            <i
              class="material-icons"
              v-tooltip="'The 12-digit AWS account ID where your database is located'"
            >help_outlined</i>
          </label>
          <input
            name="ssoAccountId"
            type="text"
            class="form-control"
            v-model="config.redshiftOptions.ssoAccountId"
            placeholder="123456789012"
          >
        </div>

        <div class="form-group">
          <label for="ssoRoleName">
            IAM Role Name
            <i
              class="material-icons"
              v-tooltip="'The IAM role to assume (must have appropriate database permissions)'"
            >help_outlined</i>
          </label>
          <input
            name="ssoRoleName"
            type="text"
            class="form-control"
            v-model="config.redshiftOptions.ssoRoleName"
            placeholder="DatabaseAccessRole"
          >
        </div>
      </div>

      <!-- Serverless Toggle (for Redshift) -->
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

      <!-- AWS Profile (for iam_file auth) -->
      <div v-show="isProfileAuth" class="form-group">
        <label for="awsProfile"> AWS Profile </label>
        <input
          name="awsProfile"
          type="text"
          class="form-control"
          v-model="config.redshiftOptions.awsProfile"
        >
      </div>

      <!-- Access Key / Secret (for iam_key auth) -->
      <div v-show="isKeyAuth">
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

      <!-- AWS Region -->
      <div class="form-group">
        <label for="AWS Region">
          AWS Region{{ isSsoAuth && isRedshift ? ' (for Redshift)' : '' }}
          <i
            v-if="isSsoAuth"
            class="material-icons"
            v-tooltip="'The AWS region where your database is located (may differ from SSO region)'"
          >help_outlined</i>
        </label>
        <input
          type="text"
          class="form-control"
          v-model="config.redshiftOptions.awsRegion"
          :placeholder="isSsoAuth ? 'us-east-1' : ''"
        >
      </div>

      <!-- Redshift-specific fields -->
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

      <!-- SSO Profile loading/refresh -->
      <div v-show="isSsoAuth">
        <div v-if="loadingProfiles" class="loading-indicator">
          <i class="material-icons spin">sync</i>
          Loading SSO profiles...
        </div>

        <div class="form-group">
          <button
            type="button"
            class="btn btn-flat btn-small"
            @click.prevent="loadProfiles"
            :disabled="loadingProfiles"
          >
            <i class="material-icons">refresh</i>
            Refresh Profiles
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import { listSsoProfiles } from '@/lib/db/clients/utils';

export default {
  props: ['config', 'authType'],
  data() {
    return {
      iamAuthenticationEnabled: this.config.redshiftOptions?.iamAuthenticationEnabled,
      isServerless: this.config.redshiftOptions?.isServerless,
      ssoProfiles: [],
      selectedProfile: '',
      loadingProfiles: false,
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
    },
    isSsoAuth() {
      return this.authType === 'iam_sso';
    },
    showCustomSsoConfig() {
      return this.selectedProfile === '__custom__' || this.ssoProfiles.length === 0;
    }
  },
  watch: {
    selectedProfile(newValue) {
      if (newValue && newValue !== '__custom__') {
        const profile = this.ssoProfiles.find(p => p.name === newValue);
        if (profile) {
          this.config.redshiftOptions.ssoProfile = profile.name;
          this.config.redshiftOptions.ssoStartUrl = profile.ssoStartUrl;
          this.config.redshiftOptions.ssoRegion = profile.ssoRegion;
          // Only set account/role if they're defined in the profile
          if (profile.ssoAccountId) {
            this.config.redshiftOptions.ssoAccountId = profile.ssoAccountId;
          }
          if (profile.ssoRoleName) {
            this.config.redshiftOptions.ssoRoleName = profile.ssoRoleName;
          }
        }
      } else if (newValue === '__custom__') {
        this.config.redshiftOptions.ssoProfile = null;
      }
    },
    authType: {
      immediate: true,
      async handler(newValue) {
        if (newValue === 'iam_sso') {
          await this.loadProfiles();
          // If config already has an SSO profile set, select it
          if (this.config.redshiftOptions?.ssoProfile) {
            this.selectedProfile = this.config.redshiftOptions.ssoProfile;
          } else if (this.config.redshiftOptions?.ssoStartUrl) {
            // Custom configuration exists
            this.selectedProfile = '__custom__';
          }
        }
      }
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
    async loadProfiles() {
      this.loadingProfiles = true;
      try {
        this.ssoProfiles = await listSsoProfiles();
      } catch (error) {
        console.error('Failed to load SSO profiles:', error);
        this.ssoProfiles = [];
      } finally {
        this.loadingProfiles = false;
      }
    },
  }
}
</script>

<style scoped>
.loading-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--theme-text-light);
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.btn-small {
  padding: 0.25rem 0.5rem;
  font-size: 0.85rem;
}
</style>

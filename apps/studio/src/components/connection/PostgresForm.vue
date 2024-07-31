<template>
  <div class="with-connection-type">
    <common-server-inputs :config="config" />
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

    <div class="advanced-connection-settings">
      <h4
        class="advanced-heading flex"
        :class="{ enabled: iamAuthenticationEnabled }"
      >
        <span class="expand">IAM Authentication</span>
        <x-switch
          @click.prevent="toggleIAMAuthentication"
          :toggled="iamAuthenticationEnabled"
        />
      </h4>
      <div class="advanced-body" v-show="iamAuthenticationEnabled">
        <div class="row gutter">
          <div class="alert alert-info">
            <i class="material-icons-outlined">info</i>
            <div>
              Use AWS IAM authentication to connect with temporary cluster
              credentials.
              <a
                href="https://docs.aws.amazon.com/redshift/latest/mgmt/generating-user-credentials.html"
                >Read More</a
              >
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
    <common-advanced :config="config" />
  </div>
</template>

<script>

  import CommonServerInputs from './CommonServerInputs.vue'
  import CommonAdvanced from './CommonAdvanced.vue'

  export default {
    components: { CommonServerInputs, CommonAdvanced },
    props: ['config'],
    computed: {
      isCockroach() {
        return this.config.connectionType === 'cockroachdb'
      },
    },
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
    },
  };
</script>

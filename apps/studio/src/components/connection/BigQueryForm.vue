<template>
  <div class="with-connection-type">
    <div class="alert alert-info">
      <div>
        Beekeeper's BigQuery support is still in its Alpha stage, and as such may be unstable and have some unusual behaviour.
        If you have any issues, please report them on our <a href="https://github.com/beekeeper-studio/beekeeper-studio/issues">GitHub.</a>
      </div>
    </div>
    <div class="form-group">
      <label for="Project Id">ProjectId</label>
      <input
        type="text"
        class="form-control"
        v-model="config.bigQueryOptions.projectId"
      >
    </div>
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
      <div
        class="advanced-body"
        v-show="iamAuthenticationEnabled"
      >
        <div class="row gutter">
          <div class="alert alert-info">
            <i class="material-icons-outlined">info</i>
            <div>
              Create a service account key. <a
                href="https://cloud.google.com/iam/docs/keys-create-delete#creating"
              >Read
                More</a>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label for="KeyFilename">
            Key file
          </label>
          <file-picker v-model="config.bigQueryOptions.keyFilename" />
        </div>
      </div>
    </div>
    <common-server-inputs :config="config" />
    <common-advanced :config="config" />
  </div>
</template>
<script>
import FilePicker from '@/components/common/form/FilePicker'
import CommonAdvanced from './CommonAdvanced'
import CommonServerInputs from './CommonServerInputs'

export default {
  components: { CommonAdvanced, CommonServerInputs, FilePicker },
  data() {
    return {
      iamAuthenticationEnabled: this.config.bigQueryOptions?.iamAuthenticationEnabled || false
    }
  },
  methods: {
    toggleIAMAuthentication() {
      this.config.bigQueryOptions.iamAuthenticationEnabled = this.iamAuthenticationEnabled = !this.iamAuthenticationEnabled
    }
  },
  props: ['config'],
}
</script>

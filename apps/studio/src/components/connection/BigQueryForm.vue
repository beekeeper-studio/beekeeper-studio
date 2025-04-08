<template>
  <div class="with-connection-type sqlite-form">
    <div class="alert alert-warning">
      <i class="material-icons">warning</i>
      <span>
        {{ $t('BigQuery support is still in beta. Please report any problems on') }} <a href="https://github.com/beekeeper-studio/beekeeper-studio/issues/new/choose">{{ $t('our issue tracker') }}</a>.
      </span>
    </div>
    <div class="form-group">
      <label for="Project Id">{{ $t('ProjectId') }}</label>
      <input
        type="text"
        class="form-control"
        :placeholder="$t('eg: example-project').toString()"
        v-model="config.bigQueryOptions.projectId"
      >
    </div>
    <div class="form-group">
      <label for="defaultDataset">{{ $t('Default Dataset') }}</label>
      <input
        type="text"
        class="form-control"
        v-model="config.defaultDatabase"
        :placeholder="$t('(Optional)').toString()"
      >
    </div>
    <toggle-form-area
      v-if="$config.isDevelopment"
      :expanded="devMode"
      :title="$t('DEV MODE OVERRIDES')"
      :hide-toggle="true"
    >
      <template v-slot:header>
        <x-switch
          @click.prevent="devMode = !devMode"
          :toggled="devMode"
        />
      </template>
      <div class="form-group">
        <label for="host">{{ $t('Host') }}</label><input
          type="text"
          class="form-control"
          v-model="config.host"
        >
      </div>
      <div class="form-group">
        <label for="port">{{ $t('Port') }}</label><input
          type="text"
          class="form-control"
          v-model="config.port"
        >
      </div>
    </toggle-form-area>
    <toggle-form-area
      :expanded="true"
      :hide-toggle="true"
      title="Authentication"
    >
      <div class="row gutter">
        <div class="alert alert-info expand">
          <i class="material-icons-outlined">info</i>
          <span>
            {{ $t('You need a service account with the roles \'BigQuery Data Viewer\' and \'BigQuery Job User\' -') }} <a
              href="https://docs.beekeeperstudio.io/docs/google-bigquery"
            > {{ $t('Read More') }}</a>
          </span>
        </div>
      </div>

      <div class="form-group">
        <label for="KeyFilename">
          {{ $t('Service Account\'s JSON Private Key') }}
        </label>
        <file-picker v-model="config.bigQueryOptions.keyFilename" />
      </div>
    </toggle-form-area>
  </div>
</template>
<script lang="ts">
import Vue from 'vue'
import FilePicker from '@/components/common/form/FilePicker.vue'
import ToggleFormArea from '../common/ToggleFormArea.vue'

export default Vue.extend({
  components: { FilePicker, ToggleFormArea },
  data() {
    return {
      iamAuthenticationEnabled: this.config.bigQueryOptions?.iamAuthenticationEnabled || false
    }
  },
  computed: {
    devMode: {
      get() {
        return this.config.bigQueryOptions.devMode
      },
      set(value: boolean) {
        this.$set(this.config.bigQueryOptions, 'devMode', !!value)
      }
    }
  },
  watch: {
    devMode() {
      if (this.devMode) {
        // set some defaults if we don't have any and dev mode is enabled
        this.config.host ||= 'localhost'
        this.config.port ||= 443
      }
    }
  },
  methods: {
    toggleIAMAuthentication() {
      this.config.bigQueryOptions.iamAuthenticationEnabled = this.iamAuthenticationEnabled = !this.iamAuthenticationEnabled
    }
  },
  props: ['config'],
})
</script>

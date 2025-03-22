<template>
  <div class="with-connection-type sqlite-form">
    <div class="alert alert-warning">
      <i class="material-icons">warning</i>
      <span>
        {{ $t('connection.bigquery.betaWarning') }} <a href="https://github.com/beekeeper-studio/beekeeper-studio/issues/new/choose">{{ $t('connection.bigquery.reportIssues') }}</a>.
      </span>
    </div>
    <div class="form-group">
      <label for="Project Id">{{ $t('connection.bigquery.projectId') }}</label>
      <input
        type="text"
        class="form-control"
        :placeholder="String($t('connection.bigquery.projectIdPlaceholder'))"
        v-model="config.bigQueryOptions.projectId"
      >
    </div>
    <div class="form-group">
      <label for="defaultDataset">{{ $t('connection.bigquery.defaultDataset') }}</label>
      <input
        type="text"
        class="form-control"
        v-model="config.defaultDatabase"
        :placeholder="String($t('connection.optional'))"
      >
    </div>
    <toggle-form-area
      v-if="$config.isDevelopment"
      :expanded="devMode"
      title="[DEV MODE OVERRIDES]"
      :hide-toggle="true"
    >
      <template v-slot:header>
        <x-switch
          @click.prevent="devMode = !devMode"
          :toggled="devMode"
        />
      </template>
      <div class="form-group">
        <label for="host">{{ $t('connection.host') }}</label><input
          type="text"
          class="form-control"
          v-model="config.host"
        >
      </div>
      <div class="form-group">
        <label for="port">{{ $t('connection.port') }}</label><input
          type="text"
          class="form-control"
          v-model="config.port"
        >
      </div>
    </toggle-form-area>
    <toggle-form-area
      :expanded="true"
      :hide-toggle="true"
      :title="$t('connection.authentication')"
    >
      <div class="row gutter">
        <div class="alert alert-info expand">
          <i class="material-icons-outlined">info</i>
          <span>
            {{ $t('connection.bigquery.serviceAccountInfo') }} <a
              href="https://docs.beekeeperstudio.io/docs/google-bigquery"
            > {{ $t('common.readMore') }}</a>
          </span>
        </div>
      </div>

      <div class="form-group">
        <label for="KeyFilename">
          {{ $t('connection.bigquery.serviceAccountKey') }}
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

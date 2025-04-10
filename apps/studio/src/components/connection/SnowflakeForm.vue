<template>
  <div>
    <div class="form-group">
      <label for="snowflakeAccount">Account</label>
      <input
        id="snowflakeAccount"
        type="text"
        class="form-control"
        placeholder="yourorganization-account"
        v-model="config.snowflakeOptions.account"
      />
      <small class="text-muted help">Your Snowflake account identifier (e.g., xy12345.us-east-1)</small>
    </div>

    <div class="form-group">
      <label for="snowflakeUser">Username</label>
      <input
        id="snowflakeUser"
        type="text"
        class="form-control"
        v-model="config.username"
        placeholder="Username"
      />
    </div>

    <div class="form-group">
      <label for="snowflakePassword">Password</label>
      <input
        id="snowflakePassword"
        type="password"
        class="form-control"
        v-model="config.password"
        placeholder="Password"
      />
    </div>

    <div class="form-group">
      <label for="snowflakeDefaultDatabase">Default Database</label>
      <input
        id="snowflakeDefaultDatabase"
        type="text"
        class="form-control"
        v-model="config.defaultDatabase"
        placeholder="Database name"
      />
    </div>

    <common-advanced
      :config="config"
      :connectionType="connectionType"
      @update="updateConfig"
      @update-read-only="updateReadOnly"
    />
  </div>
</template>

<script>
import CommonAdvanced from './CommonAdvanced.vue'

export default {
  components: {
    CommonAdvanced
  },
  props: ['config', 'connectionType'],
  data() {
    return {
      advanced: false
    }
  },
  mounted() {
    if (!this.config.snowflakeOptions) {
      this.$set(this.config, 'snowflakeOptions', {})
    }
  },
  methods: {
    updateConfig(config) {
      this.$emit('update', config)
    },
    updateReadOnly(readOnly) {
      this.$emit('update-read-only', readOnly)
    }
  }
}
</script>
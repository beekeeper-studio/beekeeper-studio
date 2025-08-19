<template>
  <div class="redis-form">
    <!-- Connection Details -->
    <div class="row gutter">
      <div class="col s9 form-group">
        <label for="host">Host</label>
        <masked-input
          :value="config.host"
          :privacy-mode="privacyMode"
          @input="val => config.host = val"
          :placeholder="'localhost'"
        />
      </div>
      <div class="col s3 form-group">
        <label for="port">Port</label>
        <masked-input
          :value="config.port"
          :privacy-mode="privacyMode"
          :type="'number'"
          @input="val => config.port = val"
          :placeholder="'6379'"
        />
      </div>
    </div>

    <!-- Authentication -->
    <div class="form-group form-group-password">
      <label for="password">Password (optional)</label>
      <input
        :type="togglePasswordInputType"
        v-model="config.password"
        class="password form-control"
        placeholder="password"
      >
      <i
        @click.prevent="togglePassword"
        class="material-icons password-icon"
      >{{ togglePasswordIcon }}</i>
    </div>

    <!-- Redis Specific Options -->
    <div class="form-group">
      <label for="database">Database</label>
      <input
        id="database"
        v-model="config.defaultDatabase"
        type="text"
        class="form-control"
        placeholder="0"
      >
      <small class="form-text text-muted">
        Not applicable to Redis Cluster
      </small>
    </div>
  </div>
</template>

<script>
import MaskedInput from '@/components/MaskedInput.vue'
import { mapState } from 'vuex'

export default {
  name: "RedisForm",
  components: {
    MaskedInput
  },
  props: {
    config: {
      type: Object,
      required: true,
    },
    testing: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      showPassword: false,
    }
  },
  computed: {
    ...mapState('settings', ['privacyMode']),
    togglePasswordIcon() {
      return this.showPassword ? "visibility_off" : "visibility"
    },
    togglePasswordInputType() {
      return this.showPassword ? "text" : "password"
    },
  },
  methods: {
    togglePassword() {
      this.showPassword = !this.showPassword
    }
  },
  created() {
    // Set default values if not already set
    if (!this.config.host) {
      this.$set(this.config, "host", "localhost");
    }
    if (!this.config.port) {
      this.$set(this.config, "port", 6379);
    }
    if (!this.config.defaultDatabase) {
      this.$set(this.config, "defaultDatabase", "0");
    }
    if (!this.config.options) {
      this.$set(this.config, "options", {});
    }
  },
};
</script>

<style scoped>
.redis-form {
  padding: 1rem 0;
}
.form-group {
  margin-bottom: 1rem;
}
.form-group label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 500;
  color: var(--text-light);
}
.form-control {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--bg-color);
  color: var(--text-color);
}
.form-control:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.2);
}
.form-control::placeholder {
  color: var(--text-lighter);
}
.form-text {
  margin-top: 0.25rem;
  font-size: 0.875rem;
}
.text-muted {
  color: var(--text-lighter);
}
</style>

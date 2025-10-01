<template>
  <div class="redis-form">
    <div class="alert alert-warning">
      <i class="material-icons">warning</i>
      <span>
        Redis support is still in beta. Please report any problems on <a href="https://github.com/beekeeper-studio/beekeeper-studio/issues/new/choose">our issue tracker</a>.
      </span>
    </div>
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
      <BaseInput
        :type="togglePasswordInputType"
        v-model="config.password"
        class="password form-control"
        placeholder="password"
      />
      <i
        @click.prevent="togglePassword"
        class="material-icons password-icon"
      >{{ togglePasswordIcon }}</i>
    </div>

    <!-- Redis Specific Options -->
    <div class="form-group">
      <label for="database">Database</label>
      <BaseInput
        id="database"
        v-model="config.defaultDatabase"
        type="number"
        class="form-control"
        placeholder="0"
      />
      <small class="form-text text-muted">
        Not applicable to Redis Cluster
      </small>
    </div>
  </div>
</template>

<script>
import MaskedInput from '@/components/MaskedInput.vue'
import BaseInput from '@/components/common/form/BaseInput.vue';
import { mapState } from 'vuex'

export default {
  name: "RedisForm",
  components: {
    MaskedInput,
    BaseInput,
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
};
</script>

<style>

</style>

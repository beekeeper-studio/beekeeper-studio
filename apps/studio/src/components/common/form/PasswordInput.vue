<template>
  <div class="password-input">
    <masked-input
      :type="showPassword ? 'text' : 'password'"
      :value="value"
      class="password"
      @input="$emit('input', $event)"
    />
    <i
      @click.prevent="showPassword = !showPassword"
      class="material-icons password-icon"
    >{{ showPassword ? 'visibility_off' : 'visibility' }}</i>
  </div>
</template>

<script>
import MaskedInput from '@/components/MaskedInput.vue';

export default {
  name: 'PasswordInput',
  components: { MaskedInput },
  props: {
    value: {
      type: [String, Number],
      default: ''
    }
  },
  data() {
    return {
      showPassword: false,
    }
  },
}
</script>

<style scoped>
.password-input {
  position: relative;
}

.password-input .password-icon {
  position: absolute;
  right: 12px;
  bottom: 5px;
  cursor: pointer;
}
</style>

<template>
  <div class="password-input">
    <input
      :type="showPassword ? 'text' : 'password'"
      :value="value"
      class="password form-control"
      @input="$emit('input', $event.target.value)"
    >
    <i
      @click.prevent="showPassword = !showPassword"
      class="material-icons password-icon"
    >{{ showPassword ? 'visibility_off' : 'visibility' }}</i>
  </div>
</template>

<script>
export default {
  name: 'PasswordInput',
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

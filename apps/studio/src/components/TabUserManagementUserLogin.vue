<template>
  <div>
    <h4 class="mb-2 flex align-center" style="gap: 6px;">
      <i class="material-icons">vpn_key</i> Login Information
    </h4>
    <div class="form-group">
      <label>Login Name:</label>
      <input
        type="text"
        v-model="localUser.user"
        class="form-control"
        placeholder="Enter username"
      />
      <div class="form-note flex align-center" style="gap: 6px;">
        <i class="material-icons">info</i>
        You may create multiple accounts with I to connect from different hosts.
      </div>
    </div>
    <div class="form-group">
      <label>Authentication Type:</label>
      <select v-model="localUser.authType" class="form-control">
        <option>caching_sha2_password</option> 
        <option>sha256_password</option>
      </select>
      <div class="form-note flex align-center" style="gap: 6px;">
        <i class="material-icons">info</i>
        For the standard password select 'caching_sha2_password'.
      </div>
    </div>
    <div class="form-group">
      <label>Limit to Hosts Matching:</label>
      <input
        type="text"
        v-model="localUser.host"
        class="form-control"
        placeholder="e.g. 127.0.0.1"
      >
      <div class="form-note flex align-center" style="gap: 6px;">
        <i class="material-icons">info</i>
        % and _ wildcards may be used
      </div>
    </div>

    <h4 class="mb-2 mt-4 flex align-center" style="gap: 6px;">
      <i class="material-icons">lock</i> Password Management
    </h4>
    <div class="form-group">
      <label>Password:</label>
      <div class="flex align-center" style="gap: 6px;">
        <input
          :type="showPassword ? 'text' : 'password'"
          v-model="localUser.password"
          class="form-control"
          placeholder="••••••••"
        >
        <button class="btn-icon ml-1" @click="$emit('toggle-password', 'password')" title="Toggle visibility">
          <i class="material-icons">{{ showPassword ? 'visibility_off' : 'visibility' }}</i>
        </button>
      </div>
      <div class="form-note flex align-center" style="gap: 6px;">
        <i class="material-icons">info</i>
        Type a password to reset it.
      </div>
    </div>
    <div class="form-group">
      <label>Confirm Password:</label>
      <div class="flex align-center" style="gap: 6px;">
        <input
          :type="showConfirmPassword ? 'text' : 'password'"
          v-model="localUser.confirmPassword"
          class="form-control"
          placeholder="••••••••"
        >
        <button class="btn-icon ml-1" @click="$emit('toggle-password', 'confirmPassword')" title="Toggle visibility">
          <i class="material-icons">{{ showConfirmPassword ? 'visibility_off' : 'visibility' }}</i>
        </button>
      </div>
      <div class="form-note flex align-center" style="gap: 6px;">
        <i class="material-icons">info</i>
        Confirm your previously typed password.
      </div>
    </div>
    <div v-if="!localUser.password && localUser?.isNew" class="alert alert-warning flex align-center mt-2" style="gap: 6px;">
      <i class="material-icons">warning</i>
      No password is set for this account.
    </div>
    <div v-if="localUser.password && localUser.confirmPassword && !passwordsMatch" class="alert alert-danger flex align-center mt-2" style="gap: 6px;">
      <i class="material-icons">warning</i>
      Password and confirmation do not match.
    </div>
  </div>
</template>

<script>
export default {
  props: {
    localUser: Object,
    showPassword: Boolean,
    showConfirmPassword: Boolean,
    passwordsMatch: Boolean,
  }
}
</script>

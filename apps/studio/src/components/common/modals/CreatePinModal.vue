<template>
  <portal to="modals">
    <modal
      :name="modalName"
      :click-to-close="false"
      @opened="opened"
      class="vue-dialog beekeeper-modal create-pin-modal"
    >
      <form v-kbd-trap="true" @submit.prevent="submit">
        <div class="dialog-content">
          <div class="dialog-c-title has-icon">
            <i class="material-icons">lock</i>
            Create your PIN
          </div>
          <div class="description">
            <p>Create a secure PIN to protect your database connections. This PIN will be required whenever you connect to any database.</p>
          </div>

          <error-alert v-if="errorMessage" :error="errorMessage" />
          <error-alert
            v-else-if="!valid && attemptedSubmit"
            :error="`PIN must be at least ${$bksConfig.security.minPinLength} characters long`"
            title="Please fix the following errors"
          />

          <div class="form-group form-group-password">
            <label for="input-pin">PIN</label>
            <input
              id="input-pin"
              name="pin"
              :type="showPin ? 'text' : 'password'"
              v-model="pin"
              ref="pinInput"
              :placeholder="`Enter at least ${$bksConfig.security.minPinLength} characters`"
            />
            <i
              class="material-icons password-icon"
              @click="togglePinVisibility"
              :title="showPin ? 'Hide PIN' : 'Show PIN'"
            >
              {{ showPin ? "visibility_off" : "visibility" }}
            </i>
          </div>

          <div class="alert alert-info">
            <i class="material-icons">info</i>
            <div class="alert-body">Your PIN is encrypted and stored securely on your device.</div>
          </div>

          <div class="alert alert-warning">
            <i class="material-icons">warning</i>
            <div class="alert-body">Make sure to remember your PIN - if you lose it, it CANNOT be recovered.</div>
          </div>
        </div>
        <div class="vue-dialog-buttons">
          <button
            class="btn btn-primary"
            type="submit"
            @click.prevent="submit"
            :disabled="submitting || !valid"
          >
            Submit
          </button>
        </div>
      </form>
    </modal>
  </portal>
</template>

<script lang="ts">
import Vue from "vue";
import ErrorAlert from "@/components/common/ErrorAlert.vue";

export default Vue.extend({
  components: { ErrorAlert },
  data() {
    return {
      modalName: "create-pin-modal",
      submitting: false,
      pin: "",
      showPin: false,
      errorMessage: "",
      attemptedSubmit: false,
    };
  },
  computed: {
    valid() {
      return this.pin.length >= this.$bksConfig.security.minPinLength;
    },
  },
  methods: {
    close() {
      this.$modal.hide(this.modalName);
    },
    opened() {
      this.$nextTick(() => {
        this.$refs.pinInput.focus();
      });
    },
    togglePinVisibility() {
      this.showPin = !this.showPin;
    },
    async submit() {
      this.attemptedSubmit = true;

      if (this.submitting) {
        return;
      }

      if (!this.valid) {
        return;
      }

      this.submitting = true;
      this.errorMessage = "";

      try {
        await this.$util.send("lock/create", { pin: this.pin });
        this.close();
      } catch (e) {
        this.errorMessage = e.message;
        this.submitting = false;
      }
    },
  },
});
</script>

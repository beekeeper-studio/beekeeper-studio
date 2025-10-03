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
            v-else-if="!validation.isValid && attemptedSubmit"
            :error="validation.message"
            title="Please fix the following errors"
          />

          <div class="form-group form-group-password">
            <label for="input-pin">PIN</label>
            <BaseInput
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

          <div class="form-group form-group-password">
            <label for="input-confirm-pin">Confirm PIN</label>
            <BaseInput
              id="input-confirm-pin"
              name="confirmPin"
              :type="showConfirmPin ? 'text' : 'password'"
              v-model="confirmPin"
              placeholder="Enter PIN again to confirm"
            />
            <i
              class="material-icons password-icon"
              @click="toggleConfirmPinVisibility"
              :title="showConfirmPin ? 'Hide PIN' : 'Show PIN'"
            >
              {{ showConfirmPin ? "visibility_off" : "visibility" }}
            </i>
          </div>

          <div class="alert alert-info">
            <i class="material-icons">info</i>
            <div class="alert-body">Your PIN is encrypted and stored securely on your device.</div>
          </div>

          <div class="alert alert-warning">
            <i class="material-icons">warning</i>
            <div class="alert-body">
              <span>
                Make sure to remember your PIN - if you lose it, it CANNOT be recovered.
                Learn about
                <external-link href="https://docs.beekeeperstudio.io/user_guide/configuration#forgot-pin">
                  PIN recovery.
                </external-link>
              </span>
            </div>
          </div>
        </div>
        <div class="vue-dialog-buttons">
          <button
            class="btn btn-primary"
            type="submit"
            @click.prevent="submit"
            :disabled="submitting || !validation.isValid"
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
import ExternalLink from "@/components/common/ExternalLink.vue";
import BaseInput from "@/components/common/form/BaseInput.vue";

export default Vue.extend({
  components: { ErrorAlert, ExternalLink, BaseInput },
  data() {
    return {
      modalName: "create-pin-modal",
      submitting: false,
      pin: "",
      confirmPin: "",
      showPin: false,
      showConfirmPin: false,
      errorMessage: "",
      attemptedSubmit: false,
    };
  },
  computed: {
    validation() {
      if (this.pin.length < this.$bksConfig.security.minPinLength) {
        return {
          isValid: false,
          message: `PIN must be at least ${this.$bksConfig.security.minPinLength} characters long`
        };
      }
      if (this.pin !== this.confirmPin) {
        return {
          isValid: false,
          message: "PINs do not match"
        };
      }
      return {
        isValid: true,
        message: ""
      };
    },
  },
  methods: {
    close() {
      this.$modal.hide(this.modalName);
    },
    opened() {
      this.$nextTick(() => {
        this.$refs.pinInput.input.focus();
      });
    },
    togglePinVisibility() {
      this.showPin = !this.showPin;
    },
    toggleConfirmPinVisibility() {
      this.showConfirmPin = !this.showConfirmPin;
    },
    async submit() {
      this.attemptedSubmit = true;

      if (this.submitting) {
        return;
      }

      if (!this.validation.isValid) {
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

<template>
  <portal to="modals">
    <modal
      :name="modalName"
      @before-open="beforeOpen"
      @opened="opened"
      class="vue-dialog beekeeper-modal update-pin-modal"
    >
      <form v-kbd-trap="true" @submit.prevent="submit">
        <div class="dialog-content">
          <div class="dialog-c-title has-icon">
            <i class="material-icons">edit</i>
            Update your PIN
            <a class="close-btn btn btn-fab" href="#" @click.prevent="close">
              <i class="material-icons">clear</i>
            </a>
          </div>
          <div class="description">
            <p>Enter your current PIN and choose a new one. Your new PIN will be required for all future database connections.</p>
          </div>
          
          <error-alert v-if="errorMessage" :error="errorMessage" />
          <error-alert
            v-if="!valid && attemptedSubmit"
            :error="`New PIN must be at least ${$bksConfig.security.minPinLength} characters long`"
            title="Please fix the following errors"
          />
          
          <div class="form-group form-group-password">
            <label for="input-old-pin">Current PIN</label>
            <input
              id="input-old-pin"
              name="oldPin"
              :type="showOldPin ? 'text' : 'password'"
              v-model="oldPin"
              ref="oldPinInput"
              placeholder="Enter your current PIN"
            />
            <i
              class="material-icons password-icon"
              @click="toggleOldPinVisibility"
              :title="showOldPin ? 'Hide current PIN' : 'Show current PIN'"
            >
              {{ showOldPin ? "visibility_off" : "visibility" }}
            </i>
          </div>
          
          <div class="form-group form-group-password">
            <label for="input-new-pin">New PIN</label>
            <input
              id="input-new-pin"
              name="newPin"
              :type="showNewPin ? 'text' : 'password'"
              v-model="newPin"
              :placeholder="`Enter at least ${$bksConfig.security.minPinLength} characters`"
            />
            <i
              class="material-icons password-icon"
              @click="toggleNewPinVisibility"
              :title="showNewPin ? 'Hide new PIN' : 'Show new PIN'"
            >
              {{ showNewPin ? "visibility_off" : "visibility" }}
            </i>
          </div>
          
          <div class="alert alert-info">
            <i class="material-icons">info</i>
            <div class="alert-body">Your new PIN will be encrypted and stored securely on your device.</div>
          </div>
        </div>
        <div class="vue-dialog-buttons">
          <button
            class="btn btn-flat btn-cancel"
            type="button"
            @click.prevent="close"
          >
            Cancel
          </button>
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
import { AppEvent } from "@/common/AppEvent";
import ErrorAlert from "@/components/common/ErrorAlert.vue";

export default Vue.extend({
  components: { ErrorAlert },
  data() {
    return {
      modalName: "update-pin-modal",
      submitting: false,
      oldPin: "",
      newPin: "",
      showOldPin: false,
      showNewPin: false,
      errorMessage: "",
      attemptedSubmit: false,
    };
  },
  computed: {
    rootBindings() {
      return [{ event: AppEvent.updatePin, handler: this.open }];
    },
    valid() {
      return this.newPin.length >= this.$bksConfig.security.minPinLength;
    },
  },
  methods: {
    beforeOpen() {
      this.submitting = false;
      this.newPin = "";
      this.oldPin = "";
      this.showOldPin = false;
      this.showNewPin = false;
      this.errorMessage = "";
      this.attemptedSubmit = false;
    },
    opened() {
      this.$nextTick(() => {
        this.$refs.oldPinInput.focus();
      });
    },
    close() {
      this.$modal.hide(this.modalName);
    },
    toggleOldPinVisibility() {
      this.showOldPin = !this.showOldPin;
    },
    toggleNewPinVisibility() {
      this.showNewPin = !this.showNewPin;
    },
    open() {
      this.$modal.show(this.modalName);
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
        await this.$util.send("lock/update", {
          oldPin: this.oldPin,
          newPin: this.newPin,
        });
        this.close();
      } catch (e) {
        this.errorMessage = e.message;
      }
      this.submitting = false;
    },
  },
  mounted() {
    this.registerHandlers(this.rootBindings);
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  },
});
</script>

<template>
  <portal to="modals">
    <modal
      :name="modalName"
      @before-open="beforeOpen"
      @opened="opened"
      @closed="closed"
      class="vue-dialog beekeeper-modal input-pin-modal"
    >
      <form v-kbd-trap="true" @submit.prevent="submit">
        <div class="dialog-content">
          <div class="dialog-c-title has-icon">
            <i class="material-icons">lock_open</i>
            Please input your PIN
            <a class="close-btn btn btn-fab" href="#" @click.prevent="close">
              <i class="material-icons">clear</i>
            </a>
          </div>
          <div class="description">
            <p>Enter your PIN to connect to the database.</p>
          </div>
          
          <error-alert v-if="errorMessage" :error="errorMessage" />
          
          <div class="form-group form-group-password">
            <label for="input-pin">PIN</label>
            <input
              id="input-pin"
              name="pin"
              :type="showPin ? 'text' : 'password'"
              v-model="pin"
              ref="pinInput"
              placeholder="Enter your PIN"
            />
            <i
              class="material-icons password-icon"
              @click="togglePinVisibility"
              :title="showPin ? 'Hide PIN' : 'Show PIN'"
            >
              {{ showPin ? "visibility_off" : "visibility" }}
            </i>
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
            :disabled="submitting"
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
      modalName: "input-pin-modal",
      submitListener: () => {},
      cancelListener: () => {},
      submitting: false,
      pin: "",
      showPin: false,
      errorMessage: "",
    };
  },
  methods: {
    beforeOpen(event) {
      const params = event.params;
      this.submitListener = params.onSubmit;
      this.cancelListener = params.onCancel;
      this.submitting = false;
      this.pin = "";
      this.showPin = false;
      this.errorMessage = "";
    },
    opened() {
      this.$nextTick(() => {
        this.$refs.pinInput.focus();
      });
    },
    close() {
      this.$modal.hide(this.modalName);
    },
    togglePinVisibility() {
      this.showPin = !this.showPin;
    },
    submit() {
      if (!this.pin) {
        this.errorMessage = "PIN is required";
        return;
      }

      this.submitting = true;
      this.errorMessage = "";
      this.close();
    },
    closed() {
      if (this.submitting) {
        this.submitListener(this.pin);
      } else {
        this.cancelListener();
      }
    },
  },
});
</script>

<template>
  <portal to="modals">
    <modal
      :name="modalName"
      @before-open="beforeOpen"
      @opened="opened"
      class="vue-dialog beekeeper-modal"
    >
      <form v-kbd-trap="true" @submit.prevent="submit">
        <div class="dialog-content">
          <div class="dialog-c-title">
            Please input your old pin and new pin to update
            <a class="close-btn btn btn-fab" href="#" @click.prevent="close">
              <i class="material-icons">clear</i>
            </a>
          </div>
          <error-alert v-if="errorMessage" :error="errorMessage" />
          <error-alert
            v-if="!valid && attemptedSubmit"
            :error="`Pin must be at least ${$bksConfig.security.minPinLength} characters long`"
          />
          <div class="form-group form-group-password">
            <label for="input-old-pin">Old pin</label>
            <input
              id="input-old-pin"
              name="oldPin"
              :type="showOldPin ? 'text' : 'password'"
              v-model="oldPin"
              ref="oldPinInput"
            />
            <i
              class="material-icons password-icon"
              @click="toggleOldPinVisibility"
              :title="showOldPin ? 'Hide old PIN' : 'Show old PIN'"
            >
              {{ showOldPin ? "visibility_off" : "visibility" }}
            </i>
          </div>
          <div class="form-group form-group-password">
            <label for="input-new-pin">New pin</label>
            <input
              id="input-new-pin"
              name="newPin"
              :type="showNewPin ? 'text' : 'password'"
              v-model="newPin"
            />
            <i
              class="material-icons password-icon"
              @click="toggleNewPinVisibility"
              :title="showNewPin ? 'Hide new PIN' : 'Show new PIN'"
            >
              {{ showNewPin ? "visibility_off" : "visibility" }}
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

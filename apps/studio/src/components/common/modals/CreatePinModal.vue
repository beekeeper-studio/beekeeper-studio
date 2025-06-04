<template>
  <portal to="modals">
    <modal
      :name="modalName"
      :click-to-close="false"
      class="vue-dialog beekeeper-modal"
    >
      <form v-kbd-trap="true" @submit.prevent="submit">
        <div class="dialog-content">
          <div class="dialog-c-title">
            Create your PIN
            <a class="close-btn btn btn-fab" href="#" @click.prevent="close">
              <i class="material-icons">clear</i>
            </a>
          </div>
          <div class="form-group form-group-password">
            <label for="input-pin">Pin</label>
            <input
              id="input-pin"
              name="pin"
              :type="showPin ? 'text' : 'password'"
              v-model="pin"
            />
            <i
              class="material-icons password-icon"
              @click="togglePinVisibility"
              :title="showPin ? 'Hide PIN' : 'Show PIN'"
            >
              {{ showPin ? 'visibility_off' : 'visibility' }}
            </i>
          </div>
        </div>
        <div class="vue-dialog-buttons">
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

export default Vue.extend({
  data() {
    return {
      modalName: "create-pin-modal",
      submitting: false,
      pin: "",
      showPin: false,
    };
  },
  methods: {
    close() {
      this.$modal.hide(this.modalName);
    },
    togglePinVisibility() {
      this.showPin = !this.showPin;
    },
    async submit() {
      if (this.submitting) {
        return;
      }
      this.submitting = true;
      try {
        await this.$util.send("lock/create", { pin: this.pin });
      } catch (e) {
        this.$noty.error(e.message);
      }
      this.submitting = false;
      this.close();
    },
  },
});
</script>

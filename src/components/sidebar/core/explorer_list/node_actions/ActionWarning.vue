<template>
  <modal class="vue-dialog beekeeper-modal" name="remove-modal" height="auto">
    <form @submit.prevent="remove" @keydown.esc="cancel">
      <div class="dialog-content">
        <div class="dialog-c-title text-danger">Redbutton-Protocoll</div>
        <p class="dialog-c-text">
          Are you sure you want to delete the {{ type }} and all the content
          inside it?
        </p>
        <label class="checkbox-group" for="rememberDeleteInfo">
          <input
            class="form-control"
            id="rememberDeleteInfo"
            type="checkbox"
            name="rememberDeleteInfo"
            v-model="options.dontAskAgain"
          />
          <span>Don't ask again</span>
          <i
            class="material-icons"
            v-tooltip="
              'If checked, we will not warn you in the future anymore (for directory deletions)'
            "
            >help_outlined</i
          >
        </label>
      </div>
      <div class="vue-dialog-buttons">
        <button class="btn btn-flat" type="button" @click="cancel">
          Cancel
        </button>
        <button class="btn btn-danger" type="submit">
          Remove
        </button>
      </div>
    </form>
  </modal>
</template>

<script>
export default {
  props: ["type"],

  data() {
    return {
      options: {
        dontAskAgain: false
      }
    };
  },

  mounted() {
    this.$modal.show("remove-modal");
  },

  beforeDestroy() {
    this.$modal.hide("remove-modal");
  },

  methods: {
    cancel() {
      this.$emit("close");
      this.$modal.hide("remove-modal");
    },

    remove() {
      this.$emit("remove", this.options)
    }
  }
};
</script>

<style></style>

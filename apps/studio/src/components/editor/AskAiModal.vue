<template>
  <portal to="modals">
    <modal
      class="vue-dialog beekeeper-modal ask-ai-modal"
      :name="modalName"
      @opened="onOpened"
      @closed="onClosed"
      height="auto"
      :scrollable="true"
    >
      <form
        v-kbd-trap="true"
        @submit.prevent="send"
      >
        <div class="dialog-content">
          <div class="dialog-c-title">
            Ask AI
          </div>
          <div class="modal-form">
            <div class="form-group">
              <label class="query-preview-label">{{ previewLabel }}</label>
              <!-- eslint-disable-next-line vue/singleline-html-element-content-newline -->
              <pre class="query-preview">{{ query }}</pre>
            </div>
            <div class="form-group">
              <label for="ask-ai-question">Your question</label>
              <textarea
                id="ask-ai-question"
                ref="questionInput"
                class="form-control"
                rows="3"
                v-model="question"
                placeholder="What do you want to know about this query?"
                @keydown.enter.exact.meta.prevent="send"
                @keydown.enter.exact.ctrl.prevent="send"
              />
            </div>
          </div>
        </div>
        <div class="vue-dialog-buttons">
          <span class="ask-ai-hint">{{ submitHint }} to send</span>
          <button
            class="btn btn-flat"
            type="button"
            @click.prevent="cancel"
          >
            Cancel
          </button>
          <button
            class="btn btn-primary"
            type="submit"
            :disabled="!canSend"
          >
            Send
          </button>
        </div>
      </form>
    </modal>
  </portal>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  name: "AskAiModal",
  props: {
    modalName: {
      type: String,
      required: true,
    },
    /** The SQL about to be sent. */
    query: {
      type: String,
      default: "",
    },
    /** True when `query` is the editor selection rather than the whole tab. */
    isSelection: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      question: "",
    };
  },
  computed: {
    canSend(): boolean {
      return this.question.trim().length > 0;
    },
    previewLabel(): string {
      return this.isSelection ? "Selected query" : "Full query";
    },
    submitHint(): string {
      return this.$config.isMac ? "⌘ + Enter" : "Ctrl + Enter";
    },
  },
  methods: {
    onOpened() {
      this.$nextTick(() => {
        (this.$refs.questionInput as HTMLTextAreaElement)?.focus();
      });
    },
    onClosed() {
      // Cancelling throws the question away — reopening starts fresh.
      this.question = "";
      this.$emit("closed");
    },
    cancel() {
      this.$modal.hide(this.modalName);
    },
    send() {
      if (!this.canSend) return;
      this.$emit("send", this.question.trim());
      this.$modal.hide(this.modalName);
    },
  },
});
</script>

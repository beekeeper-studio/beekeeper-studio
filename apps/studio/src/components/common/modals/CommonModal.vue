<template>
  <portal to="modals">
    <modal
      v-bind="$attrs"
      :class="`vue-dialog beekeeper-modal confirmation-modal ${className ?? ''}`"
      :name="id"
      @before-close="beforeClose"
      @opened="opened"
    >
      <form v-kbd-trap="true" @submit.prevent="submit" ref="form">
        <div class="dialog-content">
          <div class="dialog-c-title">
            <slot name="title"></slot>
          </div>
          <div class="dialog-c-content">
            <slot name="content"></slot>
          </div>
          <div class="dialog-c-action">
            <slot name="action"></slot>
          </div>
        </div>
      </form>
    </modal>
  </portal>
</template>

<script lang="ts">
import Vue from "vue";
import { MODAL_CLOSE_EVENT, ModalCloseEventData } from "@/components/common/modals/utils";
import _ from 'lodash';

export default Vue.extend({
  props: ['id', 'className'],
  methods: {
    opened() {
      this.$emit("opened");
    },
    beforeClose(e: { params?: { submitter?: HTMLElement } }) {
      const event: ModalCloseEventData = {
        modalId: this.id,
        // @ts-expect-error FormData can accept 2 arguments
        formData: new FormData(this.$refs.form, e.params?.submitter),
        closedWithoutSubmitter: _.isNil(e.params?.submitter),
      };
      this.trigger(MODAL_CLOSE_EVENT, event);
      this.$emit("before-close", event);
    },
    submit(event: SubmitEvent) {
      // We don't want to submit by pressing enter on an input element.
      // This causes the submitter to always pick the first submit element
      if (event.submitter !== document.activeElement) {
        return
      }
      this.$modal.hide(this.id, { submitter: event.submitter });
    },
  },
  mounted() {
    if (!this.id) {
      throw new Error("ID must be provided for making a CommonModal.");
    }
  },
});
</script>

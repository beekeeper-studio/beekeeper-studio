<template>
  <common-modal :id="id" @opened="opened">
    <template v-slot:title>
      <slot name="title">Are you sure?</slot>
    </template>
    <template v-slot:content>
      <slot name="message">
        This action cannot be undone.
      </slot>
    </template>
    <template v-slot:action>
      <button name="intent" value="cancel" class="btn btn-flat" ref="cancelBtn">
        <slot name="cancel-label">Cancel</slot>
      </button>
      <button name="intent" value="submit" class="btn btn-primary">
        <slot name="confirm-label">Confirm</slot>
      </button>
    </template>
  </common-modal>
</template>

<script lang="ts">
import Vue from "vue";
import CommonModal from "@/components/common/modals/CommonModal.vue";

export default Vue.extend({
  components: { CommonModal },
  props: ["id"],
  methods: {
    opened() {
      this.$refs.cancelBtn.focus();
    },
  },
});
</script>

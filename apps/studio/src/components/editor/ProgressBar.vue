<template>
  <div class="progress-bar">
    <div class="flex-col layout-center">
      <span>{{ message || 'loading...' }}</span>
      <a
        v-if="canCancel"
        @click.prevent="$emit('cancel')"
        :title="`Cancel Query Execution (${cancelKey})`"
        class="cancel-query btn btn-flat"
      >Cancel</a>
    </div>
  </div>
</template>
<script type="text/javascript">
  export default {
    props: {
      message: {
        type: String,
        required: false,
        default: null
      },
      canCancel: {
        type: Boolean,
        required: false,
        default: true
      },
      /** In vim mode Esc only cancels from normal mode, so advertise Ctrl-Esc. */
      cancelKey: {
        type: String,
        required: false,
        default: 'Esc'
      }
    }
  }
</script>

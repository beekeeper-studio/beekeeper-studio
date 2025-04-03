<template>
  <div class="progress-bar">
    <div class="flex-col layout-center">
      <span>{{ message || $t('loading...') }}</span>
      <a
        @click.prevent="$emit('cancel')"
        :title="$t('Cancel Query Execution (Esc)')"
        class="cancel-query btn btn-flat"
      >{{ $t('Cancel') }}</a>
    </div>
  </div>
</template>
<script type="text/javascript">
  export default {
    props: ['message']
  }
</script>

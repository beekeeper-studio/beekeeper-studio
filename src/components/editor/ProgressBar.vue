<template>
  <div class="progress-bar">
    <div class="flex flex-middle flex-center">
        <span>Query Running... <a @click.prevent="$emit('cancel')" title="Cancel Query Execution (Esc)" class="btn btn-link">Cancel</a></span>
    </div>
  </div>
</template>
<script type="text/javascript">

</script>

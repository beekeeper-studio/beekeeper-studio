<template>
  <div
    class="BksUiKit BksTextEditor"
    ref="editor"
    :style="{ height: processedHeight }"
  ></div>
</template>

<script lang="ts">
import mixin from "./mixin";

export default {
  mixins: [mixin],
};
</script>

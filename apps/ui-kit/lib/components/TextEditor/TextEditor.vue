<template>
  <textarea
    name="editor"
    class="editor"
    ref="editor"
    id=""
    cols="30"
    rows="10"
  />
</template>

<script lang="ts">
import mixin from "./mixin";

export default {
  mixins: [mixin],
};
</script>

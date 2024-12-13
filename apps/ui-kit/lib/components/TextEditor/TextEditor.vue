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

<style lang="scss">
@import './TextEditor.scss';
</style>

<script lang="ts">
import mixin from "./mixin";

export default {
  mixins: [mixin],
};
</script>

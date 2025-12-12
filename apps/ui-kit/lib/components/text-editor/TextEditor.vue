<template>
  <div class="BksUiKit BksTextEditor" ref="editor" />
</template>

<script lang="ts">
import mixin from "./mixin";
import Vue from "vue";

export default Vue.extend({
  mixins: [mixin],
});
</script>
